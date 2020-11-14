function isFirstTime () {
    if (Keywords.get()) {
        return false
    } else {
        for (let word of ["招募队员结束，队员已经集齐", "成功完成了探险"]) {
            Keywords.add(word)
        }
        return true
    }
}

function i18n () {
    callOverlayHandler({call: "getLanguage"}).then((lang) => {
        if (lang.language=== 'Chinese') {
            $(".chinese").show()
            $(".english").hide()
        } else {
            $(".chinese").hide()
            $(".english").show()
        }
    })
}

const Config = {
    get: function (key) {
        return window.localStorage.getItem(`config:${key}`)
    },
    set: function (key, value) {
        return window.localStorage.setItem(`config:${key}`, value)
    },
}

const Keywords = {
    get: function () {
        let keywords = Config.get('keyword')
        return keywords ? keywords.split(',') : null
    },
    updateHtml: function () {
        $("#keyword-div .keyword").remove()
        let keywords = Keywords.get() || []
        for (let kw of keywords) {
            if (kw) {
                $("#keyword-div").append(`<span class="mr-1 keyword btn btn-outline-light btn-sm bg-opacity-dark" onclick="Keywords.remove('${kw}')">${kw}✖</span>`)
            }
        }
    },
    add: function (kw) {
        let keywords = Keywords.get()
        let newKeywords = keywords ? keywords.concat(kw) : [].concat(kw)
        Config.set('keyword', newKeywords.join(','))
        Keywords.updateHtml()
    },
    remove: function (kw) {
        let keywords = Keywords.get()
        keywords.splice(keywords.indexOf(kw), 1)
        Config.set('keyword', keywords.join(','))
        Keywords.updateHtml()
    },
    toggle: function (kw) {
        if (Keywords.get().indexOf(kw) >= 0) {  // keyword already exists.
            Keywords.remove(kw)
        } else {
            Keywords.add(kw)
        }
    }
}

const Tts = {
    checkbox: () => document.querySelector("input[name='tts']"),
    updateHtml: function () {
        Tts.load()
    },
    ready: () => {
        if (Tts.checkbox().checked) {
            return true
        } else {
            return false
        }
    },
    save: () => {
        Config.set("tts:on", Tts.checkbox().checked ? "on" : "off")
    },
    load: () => {
        Tts.checkbox().checked = Config.get("tts:on") === "on" ? true : false
    },
    send: (data) => {  // text to speech
        if (Tts.ready()) {
            callOverlayHandler({ call: 'say', text: data })
        }
    }
}

const Webhook = {
    checkbox: () => document.querySelector("input[name='webhook']"),
    get: function () {
        let url = Config.get('webhook:url')
        let key = Config.get('webhook:key')
        if (url && key) {
            return {
                url: url,
                key: key
            }
        }
        return null
    },
    set: function ({url, key} = {}) {
        Config.set("webhook:url", url ? url : "")
        Config.set("webhook:key", key ? key : "text")
        Webhook.updateHtml()
        $('a').attr('href', url)
    },
    updateHtml: function () {
        let webhook = Webhook.get()
        if (webhook) {
            $("#webhook-btn").show()
            $("#webhook-info").text(`📡${webhook.url} {${webhook.key}:}`)
        } else {
            $("#webhook-btn").hide()
            $("#webhook-info").text("")
        }
        Webhook.load()
    },
    ready: () => {
        if (Webhook.get() && Webhook.checkbox().checked) {
            return true
        } else {
            return false
        }
    },
    save: () => {
        Config.set("webhook:on", Webhook.checkbox().checked ? "on" : "off")
    },
    load: () => {
        Webhook.checkbox().checked = Config.get("webhook:on") === "on" ? true : false
    },
    send: (url, key, data) => {  // text to webhook
        if (Webhook.ready()) {
            let param = {}
            param[key] = data
            $.post(url, JSON.stringify(param))
        }
    }
}

function update (data) {
    let content = JSON.stringify(data)
    if (!data.line) {
        return null
    }
    let [logType, logTime, ...logProperties] = data.line
    /* for more log types, visit: https://github.com/quisquous/cactbot/blob/main/docs/LogGuide.md#00-logline */
    if (logType === '00') {
        let [logUnknown, logNpc, logText, logId] = logProperties
        let webhook = Webhook.get()
        for (let kw of Keywords.get()) {
            if (kw) {
                if (logText && logText.includes(kw)) {
                    Tts.send(logText)
                    if (webhook) {
                        Webhook.send(webhook.url, webhook.key, logText)
                    }
                }
            }
        }
        if (logText.startsWith("关键字 ") || logText.startsWith("keyword ")) {
            let kw = logText.split(' ')[1]
            return Keywords.toggle(kw)
        }
        if (logText.startsWith("webhook")) {
            let [ignore, url=null, key='text'] = logText.split(' ')
            if (url) {
                Webhook.set({ url: url, key: key })
            } else {
                Webhook.set()
            }
        }
    }
}

/* for more event types, visit: https://ngld.github.io/OverlayPlugin/devs/event_types */
addOverlayListener("LogLine", (e) => update(e))
startOverlayEvents()

$(function () {
    if (!isFirstTime()) {
        $('.hidable').hide()
    }
    i18n()
    Keywords.updateHtml()
    Webhook.updateHtml()
    Tts.updateHtml()
})
