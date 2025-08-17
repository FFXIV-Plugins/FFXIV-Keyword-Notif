const VERSION = "7.0.1"
var LANGUAGE = "English"

function isFirstTime () {
    if (Keywords.get()) {
        return false
    } else {
        /* for in-game text search, visit: https://strings.wakingsands.com/ */
        let defaultWords = [
            "<tts>",
            "招募队员结束，队员已经集齐",
            "招募队员结束，招募期限已过",
            "部队消息：部队成员",
            "成功完成了探险"
        ]
        for (let word of defaultWords) {
            Keywords.add(word)
        }
        return true
    }
}

function i18n () {
    // default
    // 原生 JS 隐藏/显示
    document.querySelectorAll('.chinese').forEach(ele => ele.classList.add("hidden"));
    document.querySelectorAll('.english').forEach(ele => ele.classList.remove("hidden"));
    // translate
    callOverlayHandler({call: "getLanguage"}).then((lang) => {
        LANGUAGE = lang.language
        if (lang.language == 'Chinese') {
            document.querySelectorAll('.chinese').forEach(el => el.classList.remove("hidden"));
            document.querySelectorAll('.english').forEach(el => el.classList.add("hidden"));
        }
    })
}

const Config = {
    get: function (key) {
        return window.localStorage.getItem(`keywordnotif:config:${key}`)
    },
    set: function (key, value) {
        return window.localStorage.setItem(`keywordnotif:config:${key}`, value)
    },
}

const PrimaryPlayer = {
    id: 0,
    name: "",
}

const Keywords = {
    get: function () {
        let keywords = Config.get('keyword')
        return keywords ? keywords.split(',') : null
    },
    updateHtml: function () {
        document.querySelectorAll("#keyword-div .keyword").forEach(ele => ele.remove());
        let keywords = Keywords.get() || []
        for (let kw of keywords) {
            if (kw) {
                const span = document.createElement("span");
                span.className = "mr-1 keyword btn btn-outline-dark text-white btn-sm bg-opacity-dark";
                span.textContent = kw;
                span.onclick = function() { Keywords.remove(kw); };
                document.querySelector("#keyword-div").appendChild(span);
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
    },
    prompt: function () {
        let keyword = window.prompt(LANGUAGE == 'Chinese' ? "关键字：" : "Keyword:")
        if (keyword) {
            Keywords.toggle(keyword)
        }
    }
}

const PartySay = {
    checkbox: () => document.querySelector("input[name='partysay']"),
    updateHtml: () => PartySay.load(),
    ready: () => PartySay.checkbox().checked ? true : false,
    save: () => Config.set("partysay:on", PartySay.checkbox().checked ? "on" : "off"),
    load: () => PartySay.checkbox().checked = Config.get("partysay:on") === "on" ? true : false,
}

const NpcSay = {
    checkbox: () => document.querySelector("input[name='npcsay']"),
    updateHtml: () => NpcSay.load(),
    ready: () => NpcSay.checkbox().checked ? true : false,
    save: () => Config.set("npcsay:on", NpcSay.checkbox().checked ? "on" : "off"),
    load: () => NpcSay.checkbox().checked = Config.get("npcsay:on") === "on" ? true : false,
}

const Tts = {
    checkbox: () => document.querySelector("input[name='tts']"),
    updateHtml: () => Tts.load(),
    ready: () => Tts.checkbox().checked ? true : false,
    save: () => Config.set("tts:on", Tts.checkbox().checked ? "on" : "off"),
    load: () => Tts.checkbox().checked = Config.get("tts:on") === "on" ? true : false,
    send: (data) => {  // text to speech
        if (Tts.ready()) {
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
        Webhook.updateHtml()
    },
    updateHtml: () => {
        let webhook = Webhook.get()
        if (webhook) {
            document.querySelector("#webhook-btn").classList.remove("hidden");
            document.querySelector("#webhook-info > code").textContent = `${webhook.url} :${webhook.key}`
        } else {
            document.querySelector("#webhook-btn").classList.add("hidden");
            document.querySelector("#webhook-info > code").textContent = ""
            Webhook.checkbox().checked = false
        }
        Webhook.load()
    },
    ready: () => (Webhook.get() && Webhook.checkbox().checked) ? true : false,
    save: () => Config.set("webhook:on", Webhook.checkbox().checked ? "on" : "off"),
    load: () => Webhook.checkbox().checked = Config.get("webhook:on") === "on" ? true : false,
    send: (data) => {  // text to webhook
        if (Webhook.ready()) {
            if (Webhook.get().url.search("discord.com") >= 0) {  // discord.com need application/json with preflight
                fetch(Webhook.get().url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                    body: JSON.stringify({ "content": data })
                })
            } else {  // slack.com does not support preflight, so
                let param = {}
                param[Webhook.get().key] = data
                fetch(Webhook.get().url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                    body: JSON.stringify(param)
                })
            }
        }
    },
    hello: () => {  // send a message when checkbox is checked.
        if (Webhook.checkbox().checked) {
            Webhook.send("Webhook: ON")
        }
    },
}


function toggleHelp () {
    console.log("Toggling help")
    document.querySelectorAll("#help-div, #webhook-info").forEach(ele => ele.classList.toggle("hidden"))
}

function toggleHidable () {
    document.querySelectorAll('.hidable').forEach(ele => ele.classList.toggle('hidden'))
}

function update (data) {
    if (!data.line) {
        return null
    }
    let [logType, logTime, ...logProperties] = data.line
    /* for more log types, visit: https://github.com/quisquous/cactbot/blob/main/docs/LogGuide.md#00-logline */
    // console.debug(`logtype:${logType} -> ${logProperties}`)
    if (logType === '02') {
        let [logId, logChar, logHash] = logProperties  // logChar for Primary Player name.
        PrimaryPlayer.id = logId
        PrimaryPlayer.name = logChar
    }
    if (logType === '00') {
        let [logSubtype, logChar, logText, logHash] = logProperties
        // console.debug(`'${logSubtype}', '${logChar}', '${logText}', '${logHash}'`)
        logSubtype = logSubtype.toLowerCase()  // Both '003D' and '003d' works.
        for (let kw of Keywords.get()) {
            if (kw && logText && logText.includes(kw)) {
                Tts.send(logText)
                Webhook.send(logText)
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
                Tts.send(logText)  // logText contains only the content. logChar for NPC name.
            }
        }
        if (logSubtype == '000e') {  // Party Member Conversation.
            logChar = logChar.substring(1)  // Remove party index from name. ①NAME -> Name
            if (PartySay.ready()) {
                Webhook.send("/p " + logChar + ": " + logText)
                if (PrimaryPlayer.name !== logChar) {
                    console.debug(logChar)
                    console.debug(PrimaryPlayer.name)
                    console.debug(PrimaryPlayer.name !== logChar)
                    Tts.send(logChar + "说: " + logText)
                }
            }
        }
        if (logSubtype == '2239') { // Party Makeup Change.
            if (PartySay.ready()) {
                Webhook.send("/p " + logText)
                Tts.send(logText)
            }
        }
        if (logSubtype == '001b') { // Newbie Channel.
            // "/n " + logChar + ": " + logText
        }
        if (logSubtype == '001c') { // Emotion Channel.
            // logChar + ": " + logText
        }
        if (logSubtype == '0039') { // System Channel.
            // logText
        }
    }
}

/* for more event types, visit: https://ngld.github.io/OverlayPlugin/devs/event_types */
addOverlayListener("LogLine", (e) => update(e))
startOverlayEvents()

document.addEventListener("DOMContentLoaded", function () {
    if (!isFirstTime()) {
        document.querySelectorAll('.hidable').forEach(ele => ele.classList.add("hidden"))
    }
    i18n()
    Keywords.updateHtml()
    Webhook.updateHtml()
    Tts.updateHtml()
    NpcSay.updateHtml()
    PartySay.updateHtml()
    console.log(`[LOADED] FFXIV Keyword Notif: Version ${VERSION}`)
})
