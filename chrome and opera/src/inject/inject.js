var globalNoInputFields = 0;

//Jquery function to insert master password fields in the web page (DOM modifications).
//It sees for the input type password and inserts the new master password div into the body.
//The master password div contains the master password input field, show password icon, Extrasafe icon.
function inject(){
	$("input[type=password]:not(.extrasafeMasterPassword):not(.enableExtrasafe):not(.disableExtrasafe)").each(function(){
		globalNoInputFields++;

		//get the original password position in order to show the new master password div in correct position below the original password.
		var originalPassword = $(this);
		var passwordPosition = originalPassword.offset();
		var passwordHeight = originalPassword.outerHeight(true);

		var masterPasswordDiv = $('<div class="extrasafeMasterPasswordDiv" style="top:'+(passwordPosition.top+passwordHeight+5)+'px; left:'+passwordPosition.left+'px "></div>');
		var masterPasswordField = $('<input type="password" class="extrasafeMasterPassword" id="master_password" inputField="'+globalNoInputFields+'" placeholder="Master Password" ></input>');
		var images = $('<span class="images"></span>');
		var showPassword = $('<img class="extrasafeUnmask" src="'+chrome.extension.getURL("icons/Unmask16.png")+'"></img>');
		var extrasafeIcon = $('<img class="extrasafeIcon" src="'+chrome.extension.getURL("icons/Extrasafe16.png")+'"></img>');
		
		images.append(showPassword);
		images.append(extrasafeIcon);

		//When user clicks outside the master password div, master password div should hide
		masterPasswordDiv.focusout(function(){
			masterPasswordDiv.hide();
		});

		//User can press enter in login forms for auto submit (or) can click outside to continue with other input fields.
		//On users key up event on master password field,
		//	check for whether enter is pressed -> Send the master password to background, hide the master password div, submit the login form.
		//	If master password is empty then clear the original password field also.
		//	For all other key ups send the master password to background.
		//Reason for key up is its called after key pressed actions (eg clearing does not work properly on other key events).
		masterPasswordField.keyup(function(e){
			if(e.keyCode == 13){
				chrome.runtime.sendMessage({ masterPassword: $(this).val(), fromInputField: masterPasswordField.attr('inputField') });
				masterPasswordDiv.hide();
				originalPassword.closest("form").submit();
			}
			if(masterPasswordField.val() == ""){
				originalPassword.val("");
			}
			else{
				chrome.runtime.sendMessage({ masterPassword: $(this).val(), fromInputField: $(this).attr('inputField') });
			}
		});

		//User presses tab or shift tab we listen in key down which will be triggered before keyup.
		//We unbind , focus on originalPassword and then bind again.
		// COMMENTED : event bubbling is prevented so as to focus the original password again after pressing tab from master password instead of showing the next password
		masterPasswordField.keydown(function(e){
			if(e.keyCode == 9){
				//e.preventDefault();
				//e.stopPropagation();
				originalPassword.off("focus");
				originalPassword.focus();
				originalPassword.on("focus",toggleFocus);
			}
		});

		//If user mouse enters over the master password show password, change the input type to text.
		showPassword.mouseenter(function(){
			masterPasswordField.attr('type','text');
		});

		//If user mouse leaves over the master password show password, change the input type to password.
		showPassword.mouseleave(function(){
			masterPasswordField.attr('type','password');
		});

		//Append all the fields and icons to master password div and hide it initially.
		masterPasswordDiv.append(masterPasswordField);
		masterPasswordDiv.append(images);
		masterPasswordDiv.hide();

		//This function shows the master password div.
		var toggleFocus = function(){
			passwordPosition = originalPassword.offset();
			passwordHeight = originalPassword.outerHeight(true);
			masterPasswordDiv.css("top",(passwordPosition.top+passwordHeight+5)+'px').css("left",passwordPosition.left+'px');
			masterPasswordDiv.show();
			masterPasswordField.focus();
		}
		
		//Initially bind the focus event with toggleFocus function.
		originalPassword.on("focus",toggleFocus);

		//On Users click on page action icon to enable or disable the Extrasafe in current site. The class of original password differs, bind or unbind accordingly.
		originalPassword.on("classToggled",function(){
			if(originalPassword.hasClass('enableExtrasafe')){
				originalPassword.on("focus",toggleFocus);
			}
			else if(originalPassword.hasClass('disableExtrasafe')){
				originalPassword.off("focus");
				originalPassword.focus();
			}
		});

		//Bind the master password field in body.
		//See the inject.css for the position and !important fields to overcome the web sites css. 
		$(document.body).append(masterPasswordDiv);

		//Add class infomation, and these are initial settings.
		originalPassword.addClass(""+globalNoInputFields);
		originalPassword.addClass('enableExtrasafe');

		if( $("input[type=password].disableExtrasafe").length > 0 ){
			originalPassword.removeClass('enableExtrasafe');
			originalPassword.addClass('disableExtrasafe');
			originalPassword.trigger('classToggled');
		} 

	});
}

inject();

// Watcher for the body subtree change and checking input and password in innerHTML and triggering the inject script to create master password div for ajaxed input forms
var target = document.body;
var observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation){
  	for (var i = mutation.addedNodes.length - 1; i >= 0; i--) {
  		var node = mutation.addedNodes[i]
  		if( node.innerHTML != undefined && node.innerHTML.indexOf("input") !=-1 && node.innerHTML.indexOf("password") != -1){
  			inject();
  		}
  	};
  });    
});
var config = { childList: true, subtree: true};
observer.observe(target, config);

//Single message handler function to handle messages from content scripts.
//Note: message.result is the only field in all messages.
chrome.runtime.onMessage.addListener(function(message){

	//disable master password div
	if(message.result == "disable password div"){
		$(".extrasafeMasterPasswordDiv").hide();
		$("input[type=password]:not(.extrasafeMasterPassword)").removeClass('enableExtrasafe');
		$("input[type=password]:not(.extrasafeMasterPassword)").addClass('disableExtrasafe');
		$("input[type=password]:not(.extrasafeMasterPassword)").trigger('classToggled');
	}

	//enable master password div
	else if(message.result == "enable password div"){
		$("input[type=password]:not(.extrasafeMasterPassword)").removeClass('disableExtrasafe');
		$("input[type=password]:not(.extrasafeMasterPassword)").addClass('enableExtrasafe');
		$("input[type=password]:not(.extrasafeMasterPassword)").trigger('classToggled');
	}

	//This is the password. Set in the password field.
	else{
		$("."+message.fromInputField).each(function(){
			$(this).val(message.result);
		});
	}
});
