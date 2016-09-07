
var iconDir = "assets/images/";
var iconInactivePath = "assets/images/inactive.png";

var App = chrome.app.getDetails();

var InitComplete = false;

function init() {
    if (RuleManager.isEnabled() && RuleManager.isRuleListEnabled()) {
        ProxyPlugin.setProxyCallback = function () {
            RuleManager.loadRuleListCallback = function () {
                applySavedOptions();
                InitComplete = true;
            };
            RuleManager.loadRuleList(true);
        };
    }
    else {
        ProxyPlugin.setProxyCallback = function () {
            InitComplete = true;
        };
    }
    //if(!Settings.getValue("reapplySelectedProfile", true)){
    //var _init = function(){
    //	checkFirstTime();
    //	setIconInfo(undefined);
    //	monitorTabChanges();
    //};
    //	ProxyPlugin.updateProxyCallback = _init;
    //	ProxyPlugin.init();
    //}

    ProxyPlugin.init();
    checkFirstTime();
    monitorTabChanges();

    applySavedOptions();

    chrome.browserAction.onClicked.addListener(function () {
        if (!Settings.getValue("quickSwitch", false)) return;

        var profile = undefined;
        var currentProfile = ProfileManager.getCurrentProfile();
        var quickSwitchProfiles = Settings.getObject("quickSwitchProfiles") || [];

        var sel = false;
        for (var i in quickSwitchProfiles) {
            if (quickSwitchProfiles.hasOwnProperty(i)) {
                if (sel) {
                    sel = false;
                    profileId = quickSwitchProfiles[i];
                    break;
                }
                if (quickSwitchProfiles[i] == currentProfile.id) {
                    sel = true;
                }
            }
        }
        if (sel || typeof(profileId) == "undefined") {
            profileId = quickSwitchProfiles[0];
        }

        if (profileId == ProfileManager.directConnectionProfile.id) {
            profile = ProfileManager.directConnectionProfile;
        }
        else if (profileId == ProfileManager.systemProxyProfile.id) {
            profile = ProfileManager.systemProxyProfile;
        }
        else if (profileId == ProfileManager.autoSwitchProfile.id) {
            profile = ProfileManager.autoSwitchProfile;
        }
        else {
            profile = ProfileManager.getProfile(profileId);
        }

        if (profile == undefined) {
          return;
        }

        ProfileManager.applyProfile(profile);
        setIconInfo(profile);

        if (Settings.getValue("refreshTab", false))
            chrome.tabs.executeScript(null, { code:"history.go(0);" });
    });
}

function checkFirstTime() {
    if (!Settings.keyExists("firstTime")) {
        Settings.setValue("firstTime", ":]");
        if (!ProfileManager.hasProfiles()) {
            openOptions(true);
            return true;
        }
    }
    return false;
}

function openOptions(firstTime) {
    var url = "options.html";
    if (firstTime)
        url += "?firstTime=true";

    var fullUrl = chrome.extension.getURL(url);
    chrome.tabs.getAllInWindow(null, function (tabs) {
        for (var i in tabs) { // check if Options page is open already
            if (tabs.hasOwnProperty(i)) {
                var tab = tabs[i];
                if (tab.url == fullUrl) {
                    chrome.tabs.update(tab.id, { selected:true }); // select the tab
                    return;
                }
            }
        }
        chrome.tabs.getSelected(null, function (tab) { // open a new tab next to currently selected tab
            chrome.tabs.create({
                url:url,
                index:tab.index + 1
            });
        });
    });
}

function applySavedOptions() {
    var pid = Settings.getValue("startupProfileId", "");
    var profile = null;

    if (pid == "")
        profile = ProfileManager.getSelectedProfile();
    else
        profile = ProfileManager.getProfile(pid);

    if (profile != undefined)
        ProfileManager.applyProfile(profile);
    else
        InitComplete = true;
    setIconInfo(profile);
    applyQuickSwitch();
}

function applyQuickSwitch() {
    if (Settings.getValue('quickSwitch', false)) {
        chrome.browserAction.setPopup({ popup:'' });
    } else {
        chrome.browserAction.setPopup({ popup:'popup.html' });
    }
}

function setIconBadge(text) {
    if (text == undefined)
        text = "";

    //chrome.browserAction.setBadgeBackgroundColor({ color: [75, 125, 255, 255] });
    chrome.browserAction.setBadgeBackgroundColor({ color:[90, 180, 50, 255] });
    chrome.browserAction.setBadgeText({ text:text });
}

function setIconTitle(title) {
    if (title == undefined)
        title = "";

    chrome.browserAction.setTitle({ title:title });
}

function setIconInfo(profile, preventProxyChanges) {

    if (!profile) {
        profile = ProfileManager.getCurrentProfile();
        if (preventProxyChanges) {
            var selectedProfile = ProfileManager.getSelectedProfile();
            if (!ProfileManager.equals(profile, selectedProfile)) {
                profile = selectedProfile;
                ProfileManager.applyProfile(profile);
            }
            return;
        }
    }

    if (RuleManager.isAutomaticModeEnabled(profile)) {
        setAutoSwitchIcon();
        return;
    }

    var title = "";
    if (profile.proxyMode == ProfileManager.ProxyModes.direct || profile.proxyMode == ProfileManager.ProxyModes.system) {
        chrome.browserAction.setIcon({ path:iconInactivePath });
        title += profile.name;
    } else {
        var iconPath = iconDir + "icon-" + (profile.color || "blue") + ".png";
        chrome.browserAction.setIcon({ path:iconPath });
        title += ProfileManager.profileToString(profile, true);
    }

    setIconTitle(title);
}

RuleManager.LastProfile = null;

function setAutoSwitchIcon(url) {
    if (!RuleManager.isAutomaticModeEnabled(undefined))
        return false;

    if (url == undefined) {
        chrome.tabs.getSelected(undefined, function (tab) {
            setAutoSwitchIcon(tab.url);
        });
        return true;
    }

    RuleManager.getProfileByUrl(url, function(profile){
        RuleManager.LastProfile = profile;
        var iconPath = iconDir + "icon-auto-" + (profile.color || "blue") + ".png";

        chrome.browserAction.setIcon({ path:iconPath });


        var title = I18n.getMessage("proxy_autoSwitchIconTitle", profile.name);

        setIconTitle(title);
    });
    return true;
}

function monitorTabChanges() {
    chrome.tabs.onSelectionChanged.addListener(function (tabId) {
        chrome.tabs.get(tabId, function (tab) {
            setAutoSwitchIcon(tab.url);
        });
    });
    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        if (changeInfo.status == "complete") {
            chrome.tabs.getSelected(null, function (selectedTab) {
                if (selectedTab.id == tab.id)
                    setAutoSwitchIcon(tab.url);
            });
        }
    });
}
$(document).ready(function(){
    init();
});
