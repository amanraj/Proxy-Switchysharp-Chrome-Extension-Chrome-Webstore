
var ProfileManager = {};

ProfileManager.auto_select_mode = true;

ProfileManager.ProxyModes = {
    direct:"direct",
    manual:"manual",
    auto:"auto",
    system:"system"
};

ProfileManager.profiles = {};

ProfileManager.directConnectionProfile = {
    id:"direct",
    name:"[" + I18n.getMessage("proxy_directConnection") + "]",
    proxyMode:ProfileManager.ProxyModes.direct,
    color:"inactive"
};

ProfileManager.systemProxyProfile = {
    id:"system",
    name:"[" + I18n.getMessage("proxy_systemProxy") + "]",
    proxyMode:ProfileManager.ProxyModes.system,
    color:"inactive"
};

ProfileManager.autoSwitchProfile = {
    id:"auto",
    name:"[" + I18n.getMessage("proxy_autoSwitch") + "]",
    proxyMode:ProfileManager.ProxyModes.auto,
    color:"auto-blue",
    isAutomaticModeProfile:true,
    proxyConfigUrl:":memory:"
};

ProfileManager.currentProfileName = "<Current Profile>";

ProfileManager.init = function init() {
    ProfileManager.loadProfiles();
    ProfileManager.autoSelectFastestProxy();

};

ProfileManager.loadProfiles = function loadProfiles() {
    var profiles = Settings.getObject("profiles");
    if (profiles != undefined) {
        for (var i in profiles) {
            if (profiles.hasOwnProperty(i)) {
                var profile = profiles[i];
                profile = ProfileManager.fixProfile(profile);
            }
        }

        ProfileManager.profiles = profiles;
    }
};

ProfileManager.save = function saveProfiles() {
    Settings.setObject("profiles", ProfileManager.profiles);
};

ProfileManager.getProfiles = function getProfiles() {
    var profiles = {};
    for (var i in ProfileManager.profiles) {
        if (ProfileManager.profiles.hasOwnProperty(i)) {
            var profile = ProfileManager.profiles[i];
            profile = ProfileManager.normalizeProfile(profile);
            profiles[i] = profile;
        }
    }

    return profiles;
};

ProfileManager.setProfiles = function setProfiles(profiles) {
    profiles = $.extend(true, {}, profiles);
    ProfileManager.profiles = profiles;
};

ProfileManager.getSortedProfileArray = function getSortedProfileArray() {
    var profiles = ProfileManager.getProfiles();
    var profileArray = [];
    for (var i in profiles) {
        if (profiles.hasOwnProperty(i)) {
            profileArray[profileArray.length] = profiles[i];
        }
    }

    profileArray = profileArray.sort(Utils.compareNamedObjects);
    return profileArray;
};

ProfileManager.getSortedProfileIdArray = function getSortedProfileIdArray() {
    var profiles = ProfileManager.getSortedProfileArray();
    var profileArray = [];
    for (var i in profiles) {
        if (profiles.hasOwnProperty(i)) {
            profileArray[profileArray.length] = profiles[i].id;
        }
    }

    return profileArray;
};

ProfileManager.getProfile = function getProfile(profileId) {
    var profile;
    if (profileId == ProfileManager.directConnectionProfile.id)
        profile = ProfileManager.directConnectionProfile;
    else if (profileId == ProfileManager.systemProxyProfile.id)
        profile = ProfileManager.systemProxyProfile;
    else if (profileId == ProfileManager.autoSwitchProfile.id)
        profile = ProfileManager.autoSwitchProfile;
    else
        profile = ProfileManager.profiles[profileId];

    profile = ProfileManager.normalizeProfile(profile);
    return profile;
};

ProfileManager.getSelectedProfile = function getSelectedProfile() {
    var profile = Settings.getObject("selectedProfile");
    if (profile != undefined) {
        profile = ProfileManager.fixProfile(profile);
        profile = ProfileManager.normalizeProfile(profile);
    }

    return profile;
};

ProfileManager.getCurrentProfile = function getCurrentProfile() {
    var proxyMode;
    var proxyString;
    var proxyExceptions;
    var proxyConfigUrl;
    try {
        proxyMode = ProxyPlugin.proxyMode;
        proxyString = ProxyPlugin.proxyServer;
        proxyExceptions = ProxyPlugin.proxyExceptions;
        proxyConfigUrl = ProxyPlugin.proxyConfigUrl;
    } catch (ex) {
        Logger.log("Plugin Error @ProfileManager.getCurrentProfile() > " +
            ex.toString(), Logger.Types.error);

        return {};
    }

    if (proxyMode == ProfileManager.ProxyModes.direct)
        return ProfileManager.directConnectionProfile;
    if (proxyMode == ProfileManager.ProxyModes.system)
        return ProfileManager.systemProxyProfile;
    if (proxyMode == ProfileManager.ProxyModes.auto && ProxyPlugin.proxyConfigUrl == ProxyPlugin.memoryPath)
        return ProfileManager.autoSwitchProfile;

    var profile = ProfileManager.parseProxyString(proxyString);
    profile.proxyMode = proxyMode;
    profile.proxyExceptions = proxyExceptions;
    profile.proxyConfigUrl = proxyConfigUrl;
    profile = ProfileManager.normalizeProfile(profile);

    var foundProfile = ProfileManager.contains(profile);
    if (foundProfile)
        return foundProfile;

    profile.unknown = true;
    profile.id = "unknown";
    profile.name = ProfileManager.currentProfileName;
    return profile;
};

ProfileManager.applyProfile = function applyProfile(profile, callback) {
    Settings.setObject("selectedProfile", profile);

    if (profile.id == "auto") {
        profile = RuleManager.getAutomaticModeProfile();
    }
    if (profile.isAutomaticModeProfile) {
        RuleManager.saveAutoPacScript();
        profile.proxyConfigUrl = ProxyPlugin.autoPacScriptPath;
    }
    var proxyString = ProfileManager.buildProxyString(profile);

    try {
        var result = ProxyPlugin.setProxy(profile.proxyMode, proxyString, profile.proxyExceptions, profile.proxyConfigUrl);

        if (result != 0 || result != "0")
            throw "Error Code (" + result + ")";

    } catch (ex) {
        Logger.log("Plugin Error @ProfileManager.applyProfile(" + ProfileManager.profileToString(profile, false) + ") > " +
            ex.toString(), Logger.Types.error);
    }
};

ProfileManager.profileToString = function profileToString(profile, prettyPrint) {
    if (!prettyPrint)
        return "Profile: " + JSON.stringify(profile);

    var result = [];
    if (profile.name != undefined)
        result.push(profile.name);

    if (profile.proxyMode == ProfileManager.ProxyModes.manual) {
        if (profile.proxyHttp != undefined && profile.proxyHttp.trim().length > 0)
            result.push("HTTP: " + profile.proxyHttp);

        if (!profile.useSameProxy) {
            if (profile.proxyHttps != undefined && profile.proxyHttps.trim().length > 0)
                result.push("HTTPS: " + profile.proxyHttps);

            if (profile.proxyFtp != undefined && profile.proxyFtp.trim().length > 0)
                result.push("FTP: " + profile.proxyFtp);

            if (profile.proxySocks != undefined && profile.proxySocks.trim().length > 0)
                result.push("SOCKS" + profile.socksVersion + ": " + profile.proxySocks);
        }
    } else {
//      if (profile.proxyConfigUrl != undefined && profile.proxyConfigUrl.trim().length > 0)
        result.push("PAC Script: " + profile.proxyConfigUrl);
    }
    return result.join("\n");
};

ProfileManager.parseProxyString = function parseProxyString(proxyString) {
    if (!proxyString)
        return {};

    var profile;
    if (proxyString.indexOf(";") > 0 || proxyString.indexOf("=") > 0) {
        var proxyParts = proxyString.toLowerCase().split(";");
        profile = { useSameProxy:false, proxyHttp:"", proxyHttps:"", proxyFtp:"", proxySocks:"" };
        for (var i = 0; i < proxyParts.length; i++) {
            var part = proxyParts[i];
            if (part.indexOf("=:") > 0) // no host value
                continue;

            if (part.indexOf("http=") == 0) {
                profile.proxyHttp = part.substring(5);
            } else if (part.indexOf("https=") == 0) {
                profile.proxyHttps = part.substring(6);
            } else if (part.indexOf("ftp=") == 0) {
                profile.proxyFtp = part.substring(4);
            } else if (part.indexOf("socks=") == 0) {
                profile.proxySocks = part.substring(6);
                profile.socksVersion = 4;
            } else if (part.indexOf("socks5=") == 0) {
                profile.proxySocks = part.substring(7);
                profile.socksVersion = 5;
            }
        }
    } else {
        profile = { proxyHttp:proxyString, useSameProxy:true };
    }

    return profile;
};

ProfileManager.buildProxyString = function buildProxyString(profile) {
    if (!profile)
        return "";

    if (profile.useSameProxy)
        return profile.proxyHttp;

    var proxy = [];
    if (profile.proxyHttp)
        proxy.push("http=" + profile.proxyHttp);

    if (profile.proxyHttps)
        proxy.push("https=" + profile.proxyHttps);

    if (profile.proxyFtp)
        proxy.push("ftp=" + profile.proxyFtp);

    if (profile.proxySocks) {
        if (profile.socksVersion == 5)
            proxy.push("socks5=" + profile.proxySocks);
        else
            proxy.push("socks=" + profile.proxySocks);
    }

    return proxy.join(";");
};

ProfileManager.normalizeProfile = function normalizeProfile(profile) {
    var newProfile = {
        name:"",
        proxyMode:ProfileManager.ProxyModes.direct,
        proxyHttp:"",
        useSameProxy:true,
        proxyHttps:"",
        proxyFtp:"",
        proxySocks:"",
        socksVersion:4,
        proxyExceptions:"",
        proxyConfigUrl:"",
        color:"blue"
    };
    $.extend(newProfile, profile);
    return newProfile;
};

ProfileManager.autoSelectFastestProxy = function AutoSelect(){
    console.log('Starting auto selecting');
    if(!ProfileManager.auto_select_mode){return 0;}
    var latency_list = {};
    var threshold_img = 1000;
    var threshold_dl_count = 1;
    var fastest_profile;
    var keys_pro = Object.keys(ProfileManager.profiles);
    for (var i=0; i<keys_pro.length; ++i){
        latency_list[keys_pro[i]] = threshold_img*threshold_dl_count;
    }
    var keys_ll = Object.keys(latency_list);
    //console.log('keys_ll is '+keys_ll);
    //var delay = threshold_img*threshold_dl_count*(keys_ll.length)*2.2;
    var delay = 20000;
    //console.log('Waiting '+(delay/1000)+ ' seconds');
    var interval_get  = setInterval(get_latency_list, delay);
    //clearInterval(interval_get);
    //var interval_set  = setInterval(apply_fastest_proxy, 149000);

    function apply_fastest_proxy(){
        var min = threshold_img*threshold_dl_count*1000;
        var min_key;
        var fastest_profile;
        for (var k=0; k<keys_ll.length; ++k){
            if (latency_list[keys_ll[k]] < min){
                min = latency_list[keys_ll[k]];
                min_key = keys_ll[k];
                fastest_profile = ProfileManager.profiles[min_key];
            }
        }

        //console.log('DEBUG: Fastest Profile is --');
        //console.dir(fastest_profile);
        //console.log('Best Proxy Selected - '+fastest_profile.id);
        ProfileManager.applyProfile(fastest_profile);
    }

    function get_latency_list(){

    var count = -1;
    for (var i=0; i<keys_pro.length; ++i){
        latency_list[keys_pro[i]] = threshold_img*threshold_dl_count;
    }
    var proxy_loop_interval = setInterval(latency,threshold_img*threshold_dl_count*1.4);
    var duration;
    if(!ProfileManager.auto_select_mode){clearInterval(proxy_loop_interval);clearInterval(interval_get); //console.log('Disabled autoSelectFastestProxy');
     return;}    
    function latency(){
        count = count + 1;
        //console.log('Printing latency_list after '+(count+1)+'th proxy --');
        //pretty_print(latency_list);
        if(count > (keys_pro.length-1)){apply_fastest_proxy();clearInterval(proxy_loop_interval);return;}
        
        function pretty_print(latency_list){
            for (var j = 0; j<keys_ll.length; ++j){
                //console.log(keys_ll[j]+' - '+latency_list[keys_ll[j]]);
            }
        }
        //console.log('Started Latency');
        profile = ProfileManager.profiles[keys_pro[count]];
        ProfileManager.applyProfile(profile);
        //console.log('Selected Profile is '+localStorage.selectedProfile);
        //console.log('Applied The Given Profile. Current Profiles as shown in Pmgr - '+ProfileManager.profiles);
        
        var count_img = -1;
        
        var image_loop_interval = setInterval(avg_latency, threshold_img);
        
        function avg_latency(){
            count_img = count_img + 1;
            //console.log('Printing latency_list after '+(count_img+1)+'th image --');
            //pretty_print(latency_list);
            if (count_img  >  threshold_dl_count -1){clearInterval(image_loop_interval);return;}
            if(!ProfileManager.auto_select_mode){clearInterval(proxy_loop_interval);clearInterval(interval_get);clearInterval(image_loop_interval); //console.log('Disabled autoSelectFastestProxy');
            return;} 
            var url1 = 'http://www.gstatic.com/webp/gallery/1.webp';
            var imageAddr = 'https://www.google.co.in/images/srpr/logo11w.png?a='+escape(new Date())+Math.floor(100*Math.random()); 
            var startTime, endTime;
            var download = new Image();
            //console.log('Started the image loading');
            download.onload = function () {
                //console.log('Completed Image fully loaded');
                endTime = (new Date()).getTime();
                duration = showResults();
                download = null;
                if(duration < 0){console.warn('Duration is NEGATIVE');
            }
                latency_list[keys_pro[count]] = latency_list[keys_pro[count]] - threshold_img + duration;
            }
            startTime = (new Date()).getTime();
            download.src = imageAddr;
            function showResults() {
                //console.log('Showing the results and calculating latency');
                var d = (endTime - startTime);
                return d;
            }
            
        }
        
    }
    }

}//funtion autoselect

ProfileManager.fixProfile = function fixProfile(profile) {
    if (profile.proxy != undefined) {
        profile.proxyHttp = profile.proxy;
        delete profile.proxy;
    }
    if (profile.bypassProxy != undefined) {
        profile.proxyExceptions = profile.bypassProxy;
        delete profile.bypassProxy;
    }
    if (profile.configUrl != undefined) {
        profile.proxyConfigUrl = profile.configUrl;
        delete profile.configUrl;
    }
    if (profile.proxyMode == undefined) {
        if (profile.proxyConfigUrl != undefined && profile.proxyConfigUrl.trim().length > 0)
            profile.proxyMode = ProfileManager.ProxyModes.auto;
        else
            profile.proxyMode = ProfileManager.ProxyModes.manual;
    }

    return profile;
};

ProfileManager.hasProfiles = function hasProfiles() {
    for (var i in ProfileManager.profiles) {
        if (ProfileManager.profiles.hasOwnProperty(i)) {
            return true;
        }
    }

    return false;
};

ProfileManager.equals = function equals(profile1, profile2) {
    if (profile1.proxyMode != profile2.proxyMode)
        return false;

    if (profile1.proxyMode == ProfileManager.ProxyModes.direct)
        return true;

    if (profile1.proxyMode == ProfileManager.ProxyModes.manual) {
        if (profile1.proxyHttp != profile2.proxyHttp || profile1.useSameProxy != profile2.useSameProxy)
            return false;

        if (profile1.useSameProxy)
            return true;

        return (profile1.proxyHttps == profile2.proxyHttps
            && profile1.proxyFtp == profile2.proxyFtp
            && profile1.proxySocks == profile2.proxySocks
            /*&& profile1.socksVersion == profile2.socksVersion*/);
    }

    if (profile1.proxyMode == ProfileManager.ProxyModes.auto)
        return (profile1.proxyConfigUrl == profile2.proxyConfigUrl);
};

/**
 * Checks if |ProfileManager.profiles| contains a profile identical to the given one.
 * @param profile
 * @return if the profile found returns it, otherwise returns |undefined|.
 */
ProfileManager.contains = function contains(profile) {
    var profiles = ProfileManager.getProfiles();
    for (var i in profiles) {
        if (profiles.hasOwnProperty(i)) {
            if (ProfileManager.equals(profiles[i], profile)) {
                return profiles[i];
            }
        }
    }
};

ProfileManager.init();