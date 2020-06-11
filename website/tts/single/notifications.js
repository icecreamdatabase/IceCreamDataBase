// Temporary notifications
const CSS_COLOR_NAMES=["aliceblue","antiquewhite","aqua","aquamarine","azure","beige","bisque","black","blanchedalmond","blue","blueviolet","brown","burlywood","cadetblue","chartreuse","chocolate","coral","cornflowerblue","cornsilk","crimson","cyan","darkblue","darkcyan","darkgoldenrod","darkgray","darkgrey","darkgreen","darkkhaki","darkmagenta","darkolivegreen","darkorange","darkorchid","darkred","darksalmon","darkseagreen","darkslateblue","darkslategray","darkslategrey","darkturquoise","darkviolet","deeppink","deepskyblue","dimgray","dimgrey","dodgerblue","firebrick","floralwhite","forestgreen","fuchsia","gainsboro","ghostwhite","gold","goldenrod","gray","grey","green","greenyellow","honeydew","hotpink","indianred","indigo","ivory","khaki","lavender","lavenderblush","lawngreen","lemonchiffon","lightblue","lightcoral","lightcyan","lightgoldenrodyellow","lightgray","lightgrey","lightgreen","lightpink","lightsalmon","lightseagreen","lightskyblue","lightslategray","lightslategrey","lightsteelblue","lightyellow","lime","limegreen","linen","magenta","maroon","mediumaquamarine","mediumblue","mediumorchid","mediumpurple","mediumseagreen","mediumslateblue","mediumspringgreen","mediumturquoise","mediumvioletred","midnightblue","mintcream","mistyrose","moccasin","navajowhite","navy","oldlace","olive","olivedrab","orange","orangered","orchid","palegoldenrod","palegreen","paleturquoise","palevioletred","papayawhip","peachpuff","peru","pink","plum","powderblue","purple","rebeccapurple","red","rosybrown","royalblue","saddlebrown","salmon","sandybrown","seagreen","seashell","sienna","silver","skyblue","slateblue","slategray","slategrey","snow","springgreen","steelblue","tan","teal","thistle","tomato","turquoise","violet","wheat","white","whitesmoke","yellow","yellowgreen"];

function fixColorInput(input) {
	if (input != null) {
		if (CSS_COLOR_NAMES.indexOf(input.toLowerCase()) != -1) {
			return input;
		}
		else {
			return "#" + input;
		}
	}
}

// Initialize the parameters.
var notify = findGetParameter("notifications");
var tts_notifyWidth = findGetParameter("width");
var tts_fontSize = findGetParameter("fontsize");
var tts_textRedeemerColor = fixColorInput(findGetParameter("redeemercolor"));
var tts_textContentColor = fixColorInput(findGetParameter("contentcolor"));


// Checks if notifications are enabled.
function isNotifyEnabled() {
	if (notify == null) {
		return false;
	}
	else {
		return true;
	}
}


// Notifications
const notifyElement = document.getElementById("notifications");
const notifyRedeemer = document.getElementById("notifyRedeemer");
const notifyContent = document.getElementById("notifyContent");

function startNotifications() {
	if (isNotifyEnabled() == true) {
		notifyElement.style.display = "block"; // Enable
	}
}

function sendToNotifications(information) {
	if (isNotifyEnabled() != true) { return; }
	
	//console.log(JSON.stringify(information));
	
	notifyRedeemer.innerHTML = (information.redeemer);
	notifyContent.innerHTML = (": " + information.message);
}

function endNotifications() {
	if (isNotifyEnabled() != true) { return; }
	
	notifyElement.style.display = "none"; // Disable
}


// Notifications styles
if (isNotifyEnabled() == true) {
	
	if (tts_notifyWidth == null) {
		tts_notifyWidth = "630px";
	}
	if (tts_fontSize == null) {
		tts_fontSize = "13px";
	}
	notifyElement.style.width = tts_notifyWidth;
	notifyElement.style.fontSize = tts_fontSize;
	notifyElement.style.fontFamily = "Arial, sans-serif";

	if (tts_textRedeemerColor == null) {
		tts_textRedeemerColor = "#9147ff";
	}
	notifyRedeemer.style.color = tts_textRedeemerColor;
	notifyRedeemer.style.fontWeight = "bold";

	if (tts_textContentColor == null) {
		tts_textContentColor = "white";
	}
	notifyContent.style.color = tts_textContentColor;
	
}
