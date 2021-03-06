//Global variable site tag (eg: google).
var siteTag = "";
//Global variable for web page url. Useful for performance in findSiteTag.
var siteUrl = "";
//Global variable to remember enabling and disabling
var extrasafeDisabled = false;

//For web pages containing login form dynamically generated through ajax.
//This function listens to xmlhttprequests and reruns the DOM modification script in content script.
//TODO find similar functionality in safari
/*chrome.webRequest.onCompleted.addListener(function(info){
		safari.application.activeBrowserWindow.activeTab.page.dispatchMessage("rerun", {result:"rerun input script"});
	},
	{
		urls: ["<all_urls>"],
		types: ["xmlhttprequest"]
	}
);*/

//Single message handler.
//Called for every keyup in master password field.
//Returns the password from algorithm to content script.
safari.application.activeBrowserWindow.addEventListener("message", function(event){
	if(event.name == "key up"){
		findSiteTag(event.target.url);
		event.target.page.dispatchMessage("result", { result: Hasher.passy(event.message.masterPassword,siteTag), fromInputField: event.message.fromInputField });
	}
}, true);

safari.application.addEventListener("command", function(event){
	if(event.command == "disable"){
		broadcast("disable password div", "");
		extrasafeDisabled = true;
		var image = safari.extension.baseURI + "icons/Extrasafe_striked16.png";
		var windows = safari.extension.toolbarItems.length;
		for(var i=0; i<windows; i++){
			safari.extension.toolbarItems[i].command = "enable";
			safari.extension.toolbarItems[i].toolTip = "Click to enable extrasafe in this site";
			safari.extension.toolbarItems[i].image = image;
		}
	}
	else if(event.command == "enable"){
		broadcast("enable password div", "");
		extrasafeDisabled = false;
		var image = safari.extension.baseURI + "icons/Extrasafe16.png";
		var windows = safari.extension.toolbarItems.length;
		for(var i=0; i<windows; i++){
			safari.extension.toolbarItems[0].command = "disable";
			safari.extension.toolbarItems[0].toolTip = "Click to disable extrasafe in this site";
			safari.extension.toolbarItems[i].image = image;
		}
	}	
}, true);

//To send disabled message to newly created or navigated when browser action is already disabled
safari.application.addEventListener("navigate", function(event) {
	if(extrasafeDisabled){
		event.target.page.dispatchMessage("disable password div","");
	}
});

//To listen to changes in settings
safari.extension.secureSettings.addEventListener("change", function(event) {
	if(event.key == "extraSequence"){
		Hasher.extraSequence = event.newValue;
		window.alert("Your options are saved");
	}
	else{
		var	start = safari.extension.secureSettings.startIndex;
		var	end = safari.extension.secureSettings.endIndex;
		if((start<0) || (end>128) || (start>=end) || (start>116) || (end<12) || ((end-start)<12) ){
			window.alert("Password Length ::\nStart index : Default 0, Minimum: 0, Maximum: 116.\nEnd index : Default 12, Minimum: 12, Maximum: 128.\nEnd index should be greater than Start index.\n Difference between End index and Start index should be greater than 12");
		}
		else{
			Hasher.start = start;
			Hasher.end = end;
			window.alert("Your options are saved");
		}
	}	
}, false);

function broadcast(command,message){
	var windows = safari.application.browserWindows;
	for (var i = 0; i < windows.length; i++) {
		var tabs = windows[i].tabs;
		for (var j = 0; j < tabs.length; j++) {
			tabs[j].page.dispatchMessage(command,message);
		}
	}
}

function findSiteTag(url){
	if(siteTag != "" && siteUrl == url){
		return;
	}
	siteUrl = url;
	siteTag = "";

	//Remove the http:// tag if its in siteTag there.
	if(url.indexOf("://") > 0){
		url = url.substr( url.indexOf("://")+3, url.length );
	}
	//Split the url with "/"
	var url = url.split("/")[0];

	//Split the url with ".".
	var siteUrlBreakupArray = url.split(".");

	if(siteUrlBreakupArray.length == 0){
		siteTag = siteUrlBreakupArray[0];
		return;
	}

	//check the array strings with the pattern.
	for(var i=(siteUrlBreakupArray.length-1); i>=0; i--){
		var tempVar = siteUrlBreakupArray[i];
		if(tempVar.match("^(com|org|net|int|edu|gov|mil|co)($|[^a-zA-Z0-9])") || tempVar.match("^(in|ae|an|aq|ar|au|bd|be|bm|br|bw|ca|ch|cl|cn|cr|cs|cu|cz|de|dk|eg|es|eu|fi|fr|gb|ge|gl|gr|hk|hu|id|ie|il|iq|ir|is|it|jm|jp|ke|kh|kw|lk|mm|mn|mx|my|ng|np|nz|om|pe|pt|qa|ro|ru|sa|se|sg|su|th|uk|us|uz|va|ve|vn|za|zw)($|[^a-zA-Z0-9])")){
			siteTag = siteUrlBreakupArray[i-1];
			break;
		}
	}

	return;
}