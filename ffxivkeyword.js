function isFirstTime () {
    if (Keywords.get()) {
        return false
    } else {
        // for in-game text search, visit: https://strings.wakingsands.com/
        let defaultWords = [
            "招募队员结束，队员已经集齐",
            "成功完成了探险",
            "招募队员结束，招募期限已过",
        ]
        for (let word of defaultWords) {
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
        let keywords = this.get() || []
        for (let kw of keywords) {
            if (kw) {
                $("#keyword-div").append(`<span class="mr-1 keyword btn btn-outline-light btn-sm bg-opacity-dark" onclick="Keywords.remove('${kw}')">${kw}✖</span>`)
            }
        }
    },
    add: function (kw) {
        let keywords = this.get()
        let newKeywords = keywords ? keywords.concat(kw) : [].concat(kw)
        Config.set('keyword', newKeywords.join(','))
        Keywords.updateHtml()
    },
    remove: function (kw) {
        let keywords = this.get()
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

const NpcSay = {
    checkbox: () => document.querySelector("input[name='npcsay']"),
    updateHtml: () => this.load(),
    ready: () => this.checkbox().checked ? true : false,
    save: () => Config.set("npcsay:on", this.checkbox().checked ? "on" : "off"),
    load: () => this.checkbox().checked = Config.get("npcsay:on") === "on" ? true : false,
}

const Tts = {
    checkbox: () => document.querySelector("input[name='tts']"),
    updateHtml: () => this.load(),
    ready: () => this.checkbox().checked ? true : false,
    save: () => Config.set("tts:on", this.checkbox().checked ? "on" : "off"),
    load: () => this.checkbox().checked = Config.get("tts:on") === "on" ? true : false,
    send: (data) => {  // text to speech
        if (this.ready()) {
            callOverlayHandler({ call: 'say', text: data })
        }
    }
}

const Webhook = {
    checkbox: () => document.querySelector("input[name='webhook']"),
    get: () => {
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
    set: ({url, key} = {}) => {
        Config.set("webhook:url", url ? url : "")
        Config.set("webhook:key", key ? key : "text")
        this.updateHtml()
    },
    updateHtml: () => {
        let webhook = this.get()
        if (webhook) {
            $("#webhook-btn").show()
            $("#webhook-info").text(`📡${webhook.url} {${webhook.key}:}`)
        } else {
            $("#webhook-btn").hide()
            $("#webhook-info").text("")
            this.checkbox().checked = false
        }
        this.load()
    },
    ready: () => (this.get() && this.checkbox().checked) ? true : false,
    save: () => Config.set("webhook:on", this.checkbox().checked ? "on" : "off"),
    load: () => this.checkbox().checked = Config.get("webhook:on") === "on" ? true : false,
    send: (url, key, data) => {  // text to webhook
        if (this.ready()) {
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
    // console.debug(`logtype:${logType}: ${logProperties}`)
    if (logType === '00') {
        let [logSubtype, logNpc, logText, logId] = logProperties
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
        if (logSubtype == '003d') {  // Npc conversation.
            if (NpcSay.ready()) {
                Tts.send(logText)  // logText contains only the content. logNpc for NPC name.
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
    NpcSay.updateHtml()
})
