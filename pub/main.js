
// Global Objects and Variables ---------------------------
const socket = io();
const timer = new Timer()

// Global Dom Elements ------------------------------------
// - Playlist
const inputplaylist = document.getElementById('playlist')
const btnsetvideo = document.getElementById('btnsetvideo')
// - User ID
const myid = document.getElementById('myid')
const setid = document.getElementById('setid')
const myidloading = document.getElementById('myidloading')
const myiderror = document.getElementById('myiderror')
const btnsetid = document.getElementById('btnsetid')
// - sync with
const syncwith = document.getElementById('syncwith')
// - Global Settings
const inputglobalsyncoffset = document.getElementById('globalsyncoffset')
const inputglobalvolume = document.getElementById('globalvolume')
const mindif = document.getElementById('mindif')
const maxdif = document.getElementById('maxdif')
// - Share Link
const share = document.getElementById('share')
// - youtube
const youtubediv = document.getElementById('youtube')
const youtubewarpdiv = document.getElementById('youtubewarp')


// Global Dom Event ---------------------------------------
btnsetid.onclick = function () {
    socket.emit('setid', myid.value)
    myidloading.style.display = ''
    myiderror.style.display = 'none'
}

inputplaylist.onchange = function () {
    updateList()
}

btnsetvideo.onclick = function () {
    playHead = 0
    updateList()
    loadVideo()
}

// URL parameters -----------------------------------------
// - sync with
var syncwithparam = (new URL(location.href)).searchParams.get('sync')
if (syncwithparam != null) syncwith.value = syncwithparam

// Global settings ----------------------------------------
/**
 * damping values
 */
var damp = {
    offset: 0.5,
    deviceErrorFeed: 1,
    deviceError: 0.985,
    maxErr: 0.1,
    preloadTime: 0.1
}
/**
 * Sync limit
 */
var limit = {
    max: 0.075,
    min: 0.045
}

/**
 * GLobal Data Object
 */
var data = {
    playerdata: {},
    local: {
        time: 0,
        playTime: 0
    },
    server: {
        time: 0,
        event: 0
    },
    events: []
}

/**
 * Global event recorder
 * @param {Object} event 
 */
function record(event) {
    data.events.push({
        time: Date.now(),
        event
    })
}

// Playlist -----------------------------------------------
var playlist = []
var playHead = 0
function updateList() {
    playlist = inputplaylist.value.split(/[,\n]/).map(x => {
        try {
            var a = new URL(x).searchParams.get('v')
            if (a) return a
        } catch (e) {
            return x
        }
        return x
    })
}

function loadVideo() {
    if (playlist.length == 0) return
    playHead = playHead % playlist.length
    player.cueVideoById(playlist[playHead])
    player.playVideo()
    playHead++
    reactionTime = succedReactionTime
}

// Youtube Player -----------------------------------------
var player;
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '390',
        width: '640',
        videoId: 'NrHRTNeni-U',
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
    record({
        iframeready: true
    })
}

function onPlayerReady(event) {
    console.log('changed video')
    // event.target.playVideo();
    resizePlayer()
    record({
        playerready: true
    })
}


function onPlayerStateChange(event) {
    record({ v_state: event.data })
    if (event.data == YT.PlayerState.ENDED) {
        record({ ENDED: true })
        loadVideo();
    }
    if (event.data == YT.BUFFERING) {
        record({ BUFFERING: true })
        return
    }
    sync(true)
}
function resizePlayer() {
    var height = youtubediv.offsetWidth / 16 * 9
    player.setSize(youtubediv.offsetWidth, height)
    youtubewarpdiv.style.width = `${youtubediv.offsetWidth}px`
    youtubewarpdiv.style.height = `${height}px`
}

addEventListener('resize', function () {
    resizePlayer()
})

// Global Timing ------------------------------------------
var timeoffset_Damper = new Damper(50, 10, 5)
var timeoffset = 0
/** Send timing information to server */
function timing() {
    var time = Date.now()
    socket.emit('timing', time)
    record({
        synca: time
    })
}
//  When server responces, update timing
socket.on('timing', data => {
    var clientTime = Date.now()
    var time = (clientTime + data.clientTime) / 2
    timeoffset = timeoffset_Damper.feed(data.serverTime - time)

    record({
        syncb: {
            time1: data.clientTime,
            time2: clientTime,
            serverTime: data.serverTime
        }
    })
})

// Global Synchronization ---------------------------------
/** Send synchronize information to server,
 *  Call after timming() */
function sync(force = false) {
    var time = Date.now()

    if (player && typeof player.getPlayerState == 'function') {
        // console.log(player.getCurrentTime())

        socket.emit('sync', {
            with: syncwith.value,
            time: time,
            pack: {
                eventTime: time + timeoffset,
                state: player.getPlayerState(),
                id: player.getVideoData()['video_id'],
                time: player.getCurrentTime(),
                rate: player.getPlaybackRate()
            },
            force
        })
    }
}

// slow update
function update() {
    if (timeoffset_Damper.diverge() < limit.max * 1000)
        setTimeout(update, 3000)
    else setTimeout(update, 500)

    timing();
    sync();
}
update()

var err = 0.2
var targetVolume = false

var maxErr = null
var syncMode = false
var sync_play = false
var sync_rate = 1
var sync_eventTime = 0
var sync_targetTime = 0

var sync_expected_time = 0
var tweakSync = false
var preloadTime = 0.5
var reactionTime = 0.2
var succedReactionTime = 0
var tweaked = false

var expectWaits = 10

var tweaking = false




function getSyncTime(targetTime, eventTime, sync_play = false) {
    var syncTime = targetTime
    var currentTime = Date.now()
    if (sync_play) {
        try { globaloffset = (+inputglobalsyncoffset.value) } catch (e) { }
        syncTime += (currentTime - eventTime + globaloffset) / 1000 * sync_rate
    }
    return syncTime
}


async function tweak(targetTime, eventTime) {


    if (tweaking) return
    tweaking = true

    record({
        tweak: {
            time: targetTime,
            event: eventTime
        }
    })
    console.log('start sync')

    var globaloffset = 0
    try { globaloffset = (+inputglobalsyncoffset.value) } catch (e) { }
    var playing = false

    if (sync_play) {
        playing = true
        var d = deltaTime(getSyncTime(targetTime, eventTime, playing))

        console.log('video is playing, delta:', d, reactionTime)
        player.pauseVideo()

        var current = -deltaTime(0)

        var wait = -d - reactionTime

        if (wait < 0 || wait > preloadTime) {
            wait = preloadTime
            var seekTarget = current + d + reactionTime + preloadTime
            player.seekTo(seekTarget)
            record({
                seek: seekTarget
            })
        }

        await new Promise(done => timer.setTimeout(done, (wait) * 1000))

        player.playVideo()





    } else {
        console.log('pause')
        player.pauseVideo()
        console.log(getSyncTime(targetTime, eventTime, playing), playing)
        player.seekTo(getSyncTime(targetTime, eventTime, playing))
    }

    if (sync_play) {
        await new Promise(done => setTimeout(done, preloadTime * 2000))

        var outofexpect = 0;
        var outofexpect_Damper = new Damper(expectWaits, 2, 1)
        for (var i = 0; i < expectWaits; i++) {
            await new Promise(done => timer.setTimeout(done, 10))
            outofexpect = deltaTime(getSyncTime(targetTime, eventTime, playing))
            outofexpect = outofexpect_Damper.feed(outofexpect)
            record({
                outofexpect,
                reactionTime
            })
            //if (outofexpect > 1) preloadTime += 1
        }

        reactionTime += outofexpect * damp.deviceError

        if (reactionTime > 3) reactionTime = 3
        if (reactionTime < -1) reactionTime = -1
    }


    /*
    if (totalOutofexpect < 0) {
        preloadTime += (-totalOutofexpect) * damp.preloadTime
    } else {
        if (preloadTime > 0.5) preloadTime -= 0.02
    }
    */
    //if (reactionTime > 2) reactionTime = 0
    //if (reactionTime < preloadTime) reactionTime = 0

    record({
        tweaked: {
            time: targetTime,
            event: eventTime
        }
    })
    await new Promise(done => setTimeout(done, preloadTime * 2000))

    tweaking = false

}


function deltaTime(syncTime) {
    var videoData = player.getVideoData()
    data.playerdata = videoData
    if (videoData == null) return 0
    var videoTime = player.getCurrentTime()
    data.local.playTime = videoTime
    var deltaTime = syncTime - videoTime
    return deltaTime
}


function smoothUpdate() {
    setTimeout(() => {
        smoothUpdate()
    }, 14);

    var currentTime = Date.now()
    timer.update(currentTime)
    if (!player) return;


    if (syncMode) {
        var targetTime = sync_targetTime
        var eventTime = sync_eventTime

        var server_play_time = getSyncTime(targetTime, eventTime, sync_play)
        data.server.event = eventTime

        data.server.time = server_play_time
        delta = deltaTime(server_play_time)

        maxErr += (delta - maxErr) * damp.maxErr

        //console.log(delta)
        //if (Math.abs(delta) > 0.2)
        //if (Math.abs(delta) < 0.05)

        /*
        if (Math.abs(maxErr) > limit.max * sync_rate) {
            targetVolume = 0
            dosync = true
        }
        if (Math.abs(maxErr) < limit.min * sync_rate) {
            targetVolume = 150

            try {
                targetVolume = parseInt(inputglobalvolume.value)
            } catch (e) { }

            dosync = false
            succedReactionTime += (reactionTime - succedReactionTime) * 0.03
        }
        */

        record({
            maxErr
        })
        if (dosync) tweak(targetTime, eventTime)
    }


    try { limit.max = parseInt(maxdif.value) / 1000 } catch (e) { }
    try { limit.min = parseInt(mindif.value) / 1000 } catch (e) { }



    if (Math.abs(maxErr) > limit.max * sync_rate) {
        targetVolume = 0
        dosync = true
    }
    if (Math.abs(maxErr) < limit.min * sync_rate) {
        targetVolume = 150

        try {
            targetVolume = parseInt(inputglobalvolume.value)
        } catch (e) { }

        dosync = false
        succedReactionTime += (reactionTime - succedReactionTime) * 0.03
    }

    if (!(typeof player.getVolume == 'function')) return
    var currentVolume = player.getVolume()
    if (targetVolume !== false) {
        player.setVolume((targetVolume - currentVolume) * 0.02 + currentVolume)
    }

}
smoothUpdate()


socket.on('id', id => {
    if (id.error) return myiderror.style.display = ''
    share.value = location.origin + '?sync=' + encodeURI(id)
    if (myid.value != id) myid.value = id
    if (setid.textContent != id) setid.textContent = id
    myidloading.style.display = 'none'
})


socket.on('force', () => {
    sync(true)
})

var dosync = true


socket.on('sync', data => {
    syncMode = false
    if (data.other) {
        syncMode = true
        var pack = data.other.pack
        var eventTime = pack.eventTime - timeoffset

        var videoData = player.getVideoData()
        if (videoData == null) return

        if (pack.id != videoData.video_id) {
            player.cueVideoById(pack.id)
        }

        var syncTime = pack.time

        if (pack.state == YT.PlayerState.PAUSED || pack.state == YT.PlayerState.ENDED) {
            sync_play = false
        } else if (pack.state == YT.PlayerState.PLAYING) {
            sync_play = true
        }

        sync_targetTime = pack.time
        sync_rate = pack.rate
        sync_eventTime = eventTime
        player.setPlaybackRate(sync_rate)
    }
})
