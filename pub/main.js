const socket = io();

var damp = {
    offset: 0.5,
    deviceErrorFeed: 0.99,
    deviceError: 0.9,
    maxErr: 0.1
}


var inputplaylist = document.getElementById('playlist')
var syncwith = document.getElementById('syncwith')

var myid = document.getElementById('myid')
var setid = document.getElementById('setid')
var myidloading = document.getElementById('myidloading')
var myiderror = document.getElementById('myiderror')

var btnsetid = document.getElementById('btnsetid')
var btnsetvideo = document.getElementById('btnsetvideo')
var inputglobalsyncoffset = document.getElementById('globalsyncoffset')

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

function record(event) {
    data.events.push({
        time: Date.now(),
        event
    })
}

btnsetid.onclick = function () {
    socket.emit('setid', myid.value)
    myidloading.style.display = ''
    myiderror.style.display = 'none'
}

var playlist = []
var playHead = 0

inputplaylist.onchange = function () {
    updateList()
}

btnsetvideo.onclick = function () {
    playHead = 0
    updateList()
    loadVideo()
}

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

var timeoffset = 0


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
    event.target.playVideo();
    record({
        playerready: true
    })
}

var done = false;
function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.ENDED) {
        record({
            ENDED: true
        })
        loadVideo();
    }
    if (event.data == YT.BUFFERING) {
        record({
            BUFFERING: true
        })
        return
    }
    sync()
}

function stopVideo() {
    player.stopVideo();
}


function sync() {
    var time = Date.now()

    record({
        synca: time
    })

    if (player) {
        // console.log(player.getCurrentTime())

        socket.emit('sync', {
            with: syncwith.value,
            time: time,
            pack: {
                eventTime: time + timeoffset,
                state: player.getPlayerState(),
                id: player.getVideoData()['video_id'],
                time: player.getCurrentTime(),
            }
        })
    }
}


function update() {

    setTimeout(() => {
        update()
    }, 1000);

    sync();
}

update()

var err = 0.2
var targetVolume = false

var maxErr = null
var syncMode = false
var sync_play = false
var sync_eventTime = 0
var sync_targetTime = 0

var sync_expected_time = 0
var tweakSync = false
var preloadTime = 0.5
var reactionTime = 0.2
var succedReactionTime = 0
var tweaked = false

var expectWaits = 5



var tweaking = false




function getSyncTime(targetTime, eventTime, sync_play = false) {
    var syncTime = targetTime
    var currentTime = Date.now()
    if (sync_play) {
        try { globaloffset = (+inputglobalsyncoffset.value) } catch (e) { }
        syncTime += (currentTime - eventTime + globaloffset) / 1000
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
        var wait = d
        if (d < reactionTime || d > preloadTime + reactionTime) {
            wait = preloadTime
            player.seekTo(targetTime + wait + reactionTime)
        }

        await new Promise(done => setTimeout(done, (wait) * 1000))


        player.playVideo()



    } else {
        console.log('pause')
        player.pauseVideo()
        player.seekTo(getSyncTime(targetTime, eventTime, playing))
    }
    var outofexpectSum = 0
    for (var i = 0; i < expectWaits; i++) {
        await new Promise(done => setTimeout(done, 300))

        var outofexpect = deltaTime(getSyncTime(targetTime, eventTime, playing))
        outofexpectSum += outofexpect
        //if (outofexpect > 1) preloadTime += 1
    }
    reactionTime += (outofexpectSum / expectWaits) * damp.deviceError
    if (reactionTime > 10) reactionTime = 10
    if (reactionTime < -10) reactionTime = -10
    //if (reactionTime > 2) reactionTime = 0
    //if (reactionTime < preloadTime) reactionTime = 0
    record({
        tweaked: {
            time: targetTime,
            event: eventTime
        }
    })
    await new Promise(done => setTimeout(done, 1000))

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
    if (!player) return;

    if (syncMode) {
        var targetTime = sync_targetTime
        var eventTime = sync_eventTime

        delta = deltaTime(getSyncTime(targetTime, eventTime, sync_play))
        data.server.time = getSyncTime(targetTime, eventTime, sync_play)
        data.server.event = eventTime

        maxErr += (Math.abs(delta) - maxErr) * damp.maxErr
        //console.log(delta)
        //if (Math.abs(delta) > 0.2)
        //if (Math.abs(delta) < 0.05)

        if (Math.abs(maxErr) > 0.1) {
            targetVolume = 0
            dosync = true
        }
        if (Math.abs(maxErr) < 0.05) {
            targetVolume = 200
            dosync = false
            succedReactionTime += (reactionTime - succedReactionTime) * 0.03
        }
        record({
            maxErr
        })
        if (dosync) tweak(targetTime, eventTime)
    }


    var currentVolume = player.getVolume()
    if (targetVolume !== false) {
        player.setVolume((targetVolume - currentVolume) * 0.02 + currentVolume)
    }

}
smoothUpdate()


socket.on('id', id => {
    if (id.error) return myiderror.style.display = ''
    if (myid.value != id) myid.value = id
    if (setid.textContent != id) setid.textContent = id
    myidloading.style.display = 'none'
})

var dosync = true
socket.on('sync', data => {


    var clientTime = Date.now()
    var time = (clientTime + data.clientTime) / 2


    //console.log('ping:', clientTime - data.clientTime)

    var targetTimeOffset = data.serverTime - time

    if (Math.abs(timeoffset - targetTimeOffset) > 10)
        timeoffset = targetTimeOffset
    else
        timeoffset += (targetTimeOffset - timeoffset) * damp.offset

    // console.log('server offset:', timeoffset)
    record({
        syncb: {
            time1: data.clientTime,
            time2: clientTime,
            serverTime: data.serverTime
        }
    })

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

        if (pack.state == YT.PlayerState.PAUSED) {
            sync_play = false
        } else if (pack.state == YT.PlayerState.PLAYING) {
            sync_play = true
        }

        sync_targetTime = pack.time
        sync_eventTime = eventTime

    }

})
