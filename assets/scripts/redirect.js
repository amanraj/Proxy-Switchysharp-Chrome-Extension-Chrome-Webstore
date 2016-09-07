chrome.webRequest.onBeforeRequest.addListener(
	function(details) {
		// console.log('details (on before request )',details);
		// console.log('onbeforerequest');
		var requestedURL = details.url;
		var redirectURL = getReturnUrl(requestedURL);
		if (redirectURL !== null) {
			// console.log('tabId ',details.tabId);
			return {redirectUrl: redirectURL}
		}
		else{
			return {cancel:false};
		}
	},
	{urls: ["http://*/*", "https://*/*"]},
	["blocking"]
);
