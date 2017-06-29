const _debug 	= true;
const bungie 	= require('./bungie');

const Message 		= require('./message').Message;
const MessageData	= require('./message').MessageData;

/*  cache for messages sent to slack */
var messageCache = {};
/* 
const tempMs = new Message("1234", "", Date.now(), Date.now(), "uid1234", new MessageData({hasJoin:true}, null, Date.now(), "Eastern"), null);
messageCache[tempMs.timestamp] = tempMs;
console.log(messageCache[tempMs.timestamp].messageData.join);
 */
 
var icon_url = ""; //"http://tiles.xbox.com/tiles/VV/QY/0Wdsb2JhbC9ECgQJGgYfVilbL2ljb24vMC84MDAwAAAAAAAAAP43VEo=.jpg"; 
var app_name = "Destiny App";

var menu_color 		= "#3AA3E3";
var invite_color 	= "#31110A";
var join_ask 		= "Join them?";

var join_attach_id = "join_actions";
var join_poll_attach_id = "join_poll";
var imon_cache = [];


/* 
* 	menu actions
*		actions to perform in web app based on the id of action
*/
var action = {
	imon : 				"imon",
	join : 				"join",
	
	gettingon : 		"getingonat",
	gettingon_menu : 	"onatmenu",
	gettingon_start : 	"onat_start",
	gettingon_hour : 	"onat_hour",
	gettingon_amp : 	"onat_ampm",
	gettingon_day : 	"onat_day",
	
	askgeton : 			"askgeton",
	
	setname : 			"name",
	setimage : 			"image",
	
	refreshDestiny :    "bid",
	
	addJoin: 			"addJoin",
	removeJoin: 		"removeJoin",
};


/* 
* 	destiny activity types
*/
var activity = {
	raid : 		"Raid",
	trials : 	"Trials",
	pvp : 		"PvP",
	strike : 	"Strike",
}


/* 
* 	handle all the destiny app requests
*/
function handleDestinyReq(req, res){
	res.status(200).end(); // prevents weird time-out response
	
	var concat = '';
	try{
		if(req.body){
			var reqBody = req.body;
			
			if(reqBody.payload){ // an action button was clicked
				var payload = JSON.parse(reqBody.payload); // turn payload into json obj
				
				console.log('payload: ' + JSON.stringify(payload, null, 2) );
				
				// get user
				users.getUser(payload.user.id, null, function(user){
					payload.user = user;
					// perform action
					handleDestinyButtonAction(payload);
				} );
			}else{
				// SLASH COMMANDS
				console.log('ReqBody: ' + JSON.stringify(reqBody, null, 2) );
				// TODO get user?
				handleSlashCommand(reqBody);
			}
		}else{
			concat += ' NO BODY ';
		}
	}catch(e){
		console.error(e.message);
	}
}


/*
*	handle button actions
*
*/
function handleDestinyButtonAction(payload){
	var actionName = payload.actions[0].name;
				
	// SEND MESSAGE -- IM ON
	if(action.imon == actionName){
		sendImOn(payload, payload.user);
	}
	
	
	// MENU -- ON AT...
	else if(action.gettingon_menu == actionName){
		sendImOnAt_Menu(payload.response_url, payload);
	}
	
	// MENU
	else if(action.gettingon_start == actionName){
		sendImOnAt_Start(payload.response_url, payload);
	}
	// MENU
	else if(action.gettingon_hour == actionName){
		sendImOnAt_AmPm(payload.response_url, payload);
	}
	// MENU
	else if(action.gettingon_amp == actionName){
		sendImOnAt_Day(payload.response_url, payload);
	}
	// SEND MESSAGE -- ON AT...
	else if(action.gettingon_day == actionName){
		sendGettingOn(payload, payload.user);
	}
	
	// SEND MESSAGE -- ON AT...
	else if(action.askgeton == actionName){
		sendGettingOn(payload, payload.user);
	}
	
	
	// TODO not fully implemented
	/* else if(action.askgeton == actionName){
		sendAskGetOn(payload, payload.user);
	} */
	
	
	// JOIN ACTION
	else if(action.join == actionName){
		handleJoin(payload);
	}
	else if(action.addJoin == actionName){
		handleAddJoin(payload);
	}
	else if(action.removeJoin == actionName){
		handleRemoveJoin(payload);
	}
	
	else{
		var message = {
			"text": payload.user.name+" clicked: "+payload.actions[0].name +"\n"
			 + JSON.stringify(payload, null, 2),
			"replace_original": false
		}
		sendMessageToSlackResponseURL(payload.response_url, message);
	}
}

/*
*	handle slash commands
*
*/
function handleSlashCommand(reqBody){
	var userId = reqBody.user_id;
	if(!reqBody.text || reqBody.text.trim() == ""){
		// show basic menu
		sendBasicMenu(reqBody.response_url);
	}else{
		// parse into command and parameters
		var params = reqBody.text.split(' ');
		
		// set user name
		if(action.setname == params[0]){
			users.setUserName(userId, params[1])
		
		// set user image
		} else if(action.setimage == params[0]){
			users.setUserImage(userId, params[1])
		
		// refresh destiny data
		} else if(action.refreshDestiny == params[0]){
			// get id, validate long
			var bid = params[1];
			if(bid && parseInt(bid)){
				// function (bungieId, callback)
				refreshDestinyData(parseInt(bid), function(data){
					console.log('refreshDestinyData callback...');
					console.log(JSON.stringify(data, null, 2));
					
					console.log(data.bid);
					console.log(data.img);
					console.log(data.name);
					
					//setAndStoreUser = function (userId, name, image, bungieId){
					users.setAndStoreUser(userId, data.name, data.img, data.bid);
					// TODO respond with current user data
				});
			}else{
				// TODO respond with current user data
			}
		}
		
		// IM ON
		else if(action.imon == params[0]){
			// send "I'm On" message
			users.getUser(userId, null, function(user){
				sendImOn(reqBody, user);
			} );
		}
	}
}

/*
*	return the slack format name reference with player name
*
*/
function getNameRef(user){
	// <@U024BE7LH|bob>
	return users.getPlayerName(user);
}

/* sends a "Player is on!" message
*
*	PetterNincompoop is on Destiny!
*	Join them? [yes] [maybe] [no]
*
*/
function sendImOn(payload, user){
	debug('SendImOn: \n' + "payload:" + JSON.stringify(payload, null, 2)
	+ "\n user:" + JSON.stringify(user, null, 2));
	
	
	// clear private message
	//if(payload && payload.channel) clearPrivate(payload.response_url);
	
	var username = getNameRef(user);
	var title = "_*" + username + "*" + " is on Destiny!_";
	
	var message = {
		"text": title,
		"username": app_name,
		"icon_url": icon_url,
		"replace_original": true,
		"attachments": [
			getJoinAttachment(username, true, user)
		]
	}
	// sendMessageToSlackResponseURL(siteData.generalWebhook, message);
	
	// update channel id for message api
	if(payload.channel_id){
		message.channel = payload.channel_id;
	}		
	else{
		message.channel = payload.channel.id;
	}
	
	// stringify attachments array
	message.attachString = JSON.stringify(message.attachments);
	postMessage(message, siteData.appAuthToken, function(messageId){
		debug('in post callback. messageId:' + messageId);
		// send update message
		sendMessageUpdateMenu(payload.response_url, messageId);
		
		// store message
		addMessage(messageId, message, payload, user);
	});
}

function addMessage(messageId, message, payload, user){
	//MessageData(join, activity, time, timeZone)
	var join = {hasJoin: true};
	var xtraData = new MessageData(join, null, Date.now(), "Eastern");
	// new Message(timestamp, responseUrl, dateAdded, dateModified, userId, extraData, orginalMessage)
	messageCache[messageId] = new Message(messageId, "", Date.now(), Date.now(), user.userId, xtraData, message);
	
	debug(messageCache[messageId]);
}

function sendMessageUpdateMenu(responseURL, messageId){
	var message = {
		"attachments": [
			{
				"text": "Update Message:",
				"fallback": "Update Message Menu",
				"callback_id": "update_menu"+messageId,
				"color": menu_color,
				"attachment_type": "default",
				"replace_original": false,
				"actions": [
					{
						"name": action.addJoin,
						"value": messageId,
						"text": "Add Join",
						"type": "button"
					},
					{
						"name": action.removeJoin,
						"value": messageId,
						"text": "Remove Join",
						"type": "button"
					},
					/* {
						"name": action.askgeton,
						"value": action.askgeton,
						"text": "Getting On?",
						"type": "button"
					} */
					// TODO menu type, "others"
					// a menu drop-down of stats, status, etc
				]
			}
		]
	}
	sendMessageToSlackResponseURL(responseURL, message);
}

/* send a "getting on at..." message
* 	can be result of specific time buttons or
* 	result of cache menu responses
*/
function sendGettingOn(payload, user){
	// clear private message
	clearPrivate(payload.response_url);
	
	var time_day = "Sometime Today";
	
	if(imon_cache[payload.user.id] && payload.actions[0].selected_options){
		time_day = imon_cache[payload.user.id] + " " + payload.actions[0].selected_options[0].value;
	}else{
		time_day = payload.actions[0].value;
	}
	
	imon_cache[payload.user.id] = null;
	
	var username = getNameRef(user);
	var title = "_*" + username + "*" + " is getting on Destiny at:_\n";
	title += "*"+time_day+"*";
	
	var message = {
		"text": title,
		"username": app_name,
		"icon_url": icon_url,
		"replace_original": true,
		"attachments": [
			getJoinAttachment(username, true, user)
		]
	};
	
			
			
	sendMessageToSlackResponseURL(siteData.generalWebhook, message);
}

/* send a "anyone getting on?" message
* 	TODO not fully implemented
*/
function sendAskGetOn(payload, user){
	// clear private message
	clearPrivate(payload.response_url);
	
	var time = "Today"; // Tonight | Tommorow | this Weekend
	
	var username = getNameRef(user);
	var title = "*" + username + ":* " +"_Is anyone getting on Destiny " + time + "?_";
	
	var message = {
		"text": title,
		"username": app_name,
		"icon_url": icon_url,
		"replace_original": true,
		"attachments": [
			getJoinAttachment(username, false, user)
		]
	}
	sendMessageToSlackResponseURL(siteData.generalWebhook, message);
}

/* 	the join question attachment for orginal message posts
* 	buttons triger the 'join' action whcih updates the poll results
*/
function getJoinAttachment(username, ask=true, user){
	return {
				"text": ask ? join_ask : "",
				"fallback": "Join " + username + " on Destiny?",
				"callback_id": join_attach_id,
				"color": invite_color,
				"attachment_type": "default", // TODO what is this?
				"thumb_url": users.getThumbUrl(user),

				"actions": [
					{
						"name": action.join,
						"value": "yes",
						"text": "Yes",
						"type": "button"
					},
					{
						"name": action.join,
						"value": "maybe",
						"text": "Maybe",
						"type": "button"
					},
					{
						"name": action.join,
						"value": "no",
						"text": "No",
						"type": "button"
					}
				]
			}
}

/* 
*	the "poll results" attachment with fields
*/
function getPollAttachment(fieldArray){
	return {
				"callback_id": join_poll_attach_id,
				"fallback": "Join Poll",
				"color": invite_color,
				"fields": fieldArray
			}
}

function handleAddJoin(payload){
	debug("handleAddJoin...");
	
	var ts = payload.actions[0].value;
	debug(messageCache[ts]);
	
	var messageClass = messageCache[ts];
	var message = messageClass.orginalMessage;

	messageClass.messageData.join.hasJoin = true;
	messageClass.dateModified = Date.now();
	
	var joinPollIndex = 0; // TODO search for join poll
	
	// set second attachment as fields
	message.attachments[joinPollIndex] = getJoinAttachment(getNameRef(payload.user), true, payload.user);
	// replace original
	message.replace_original = true;
	
	// try updating message with api
	message.channel = payload.channel.id;
	// stringify message attachments
	message.attachString = JSON.stringify(message.attachments);
	updateMessage(ts, message, siteData.appAuthToken);
}


function handleRemoveJoin(payload){
	debug("handleRemoveJoin...");
	
	var ts = payload.actions[0].value;
	debug(messageCache[ts]);
	
	var messageClass = messageCache[ts];
	var message = messageClass.orginalMessage;

	messageClass.messageData.join.hasJoin = false;
	messageClass.dateModified = Date.now();
	
	var joinPollIndex = 0;
	
	// set second attachment as fields
	message.attachments[joinPollIndex] = null;
	// replace original
	message.replace_original = true;
	
	// try updating message with api
	message.channel = payload.channel.id;
	// stringify message attachments
	message.attachString = JSON.stringify(message.attachments);
	updateMessage(ts, message, siteData.appAuthToken);
}

function getJoinFields(message){
	const fieldValSplit = ", ";
	if(message.data.join.hasYes){
		fieldsArray.push({
						"title": "Yes",
						"value": "",
						"short": false
					});
		for(int i = 0; i < joinValues.size; i++){
			fieldsArray[i].value += (k > 0 ? fieldValSplit : "") + 
				joinValues[i];// TODO GET USER NAME
		}
		
	}
}

// add or remove from message.data.join[choice]
	// check limit
	// remove from all others
function addUserToJoinArea(user, choice, message){
		// add user to chosen field
		var fieldNum = 0;
		if(choice == "maybe"){
			fieldNum = 1;
		}else if(choice == "no"){
			fieldNum = 2;
		}
		fieldsArray[fieldNum].value += (hasValues[fieldNum] ? fieldValSplit : "") + username;
	}

/* 	
*	handles join action for all join attachments
* 	join poll becomes second attachment to all messages
*	contains the names of users who clicked yes, no, maybe 
*/
function handleJoin(payload){
	//debug('payload: \n' + JSON.stringify(payload, null, 2));
	// get message as original message
	var messageClass = messageCache[payload.message_ts];
	
	// add user to choice area, remove from others
	addUserToJoinArea(payload.user, payload.actions[0].value, messageClass);
	
	// build poll result attahcment w field array available in join data
	
	var message = messageClass.orginalMessage;
	// set second attachment with fields
	message.attachments[1] = getPollAttachment(getJoinFields(messageClass)); // set at index 1 since join poll should be at 0
	// replace original
	message.replace_original = true;
	// update channel for message api
	message.channel = payload.channel.id;
	// stringify message attachments
	message.attachString = JSON.stringify(message.attachments);
	updateMessage(message.ts, message, siteData.appAuthToken, function(){
		// TODO need to update "update menu" message... 
		// respond immediatly with 'clearUpdateMenu' at the end of all actions
	});
}


/* 
*	sent the menu for the "im on at..."
* 	has static button options and 'custom' drop-down menu options
*/
function sendImOnAt_Menu(responseURL, payload){
	imon_cache[payload.user.id] = null;
	var message = {
		"replace_original": true,
		"attachments": [
			{
				"text": "I'm On At:",
				"fallback": "Im On At menu",
				"callback_id": "destiny_imonat_menu",
				"color": menu_color,
				"attachment_type": "default",
				"actions": [
				// 1200 500 8-900
					{
						"name": action.gettingon,
						"value": "12:00 PM Today",
						"text": "12:00 PM",
						"type": "button"
					},
					{
						"name": action.gettingon,
						"value": "5:00 PM Today",
						"text": "5:00 PM",
						"type": "button"
					},
					{
						"name": action.gettingon,
						"value": "8-9:00 PM Today",
						"text": "8-9:00 PM",
						"type": "button"
					},
				// start custom time sequence
					{
						"name": action.gettingon_start,
						"value": "submit custon",
						"text": "Custom Time",
						"type": "button"
					}
				]
			}
		]
	}
	sendMessageToSlackResponseURL(responseURL, message)
}

function sendImOnAt_Start(responseURL, payload){
	imon_cache[payload.user.id] = "";
	var message = {
		"replace_original": true,
		"attachments": [
			{
				"text": "I'm On At:",
				"fallback": "Im On At menu",
				"callback_id": "destiny_imonat_menu",
				"color": menu_color,
				"attachment_type": "default",
				"actions": [
				// 1-12
					{
				    "name": action.gettingon_hour,
                    "text": "Hour...",
                    "type": "select",
                    "options": [
                        {
                            "text": "1:00",
                            "value": "1:00"
                        },
						{
                            "text": "2:00",
                            "value": "2:00"
                        },
						{
                            "text": "3:00",
                            "value": "3:00"
                        },
						{
                            "text": "4:00",
                            "value": "4:00"
                        },
						{
                            "text": "5:00",
                            "value": "5:00"
                        },
						{
                            "text": "6:00",
                            "value": "6:00"
                        },
						{
                            "text": "7:00",
                            "value": "7:00"
                        },
						{
                            "text": "8:00",
                            "value": "8:00"
                        },
						{
                            "text": "9:00",
                            "value": "9:00"
                        },
						{
                            "text": "10:00",
                            "value": "10:00"
                        },
						{
                            "text": "11:00",
                            "value": "1:00"
                        },
						{
                            "text": "12:00",
                            "value": "12:00"
                        }
					]
					}
				]
			}
		]
	}
	sendMessageToSlackResponseURL(responseURL, message)
}

function sendImOnAt_AmPm(responseURL, payload){
	imon_cache[payload.user.id] = payload.actions[0].selected_options[0].value;
	var message = {
		"replace_original": true,
		"attachments": [
			{
				"text": "I'm On At:" + "\n" + imon_cache[payload.user.id],
				"fallback": "Im On At menu",
				"callback_id": "destiny_imonat_menu",
				"color": menu_color,
				"attachment_type": "default",
				"actions": [
				// am | pm
					{
				    "name": action.gettingon_amp,
                    "text": "AM/PM...",
                    "type": "select",
                    "options": [
                        {
                            "text": "AM",
                            "value": "AM"
                        },
						{
                            "text": "PM",
                            "value": "PM"
                        }
					]
					},
				// re-starts custom time sequence
					{
						"name": action.gettingon_start,
						"value": "submit custon",
						"text": "Re-select",
						"type": "button"
					}
				]
			}
		]
	}
	sendMessageToSlackResponseURL(responseURL, message)
}

function sendImOnAt_Day(responseURL, payload){
	imon_cache[payload.user.id] += " " + payload.actions[0].selected_options[0].value;
	var message = {
		"replace_original": true,
		"attachments": [
			{
				"text": "I'm On At:" + "\n" + imon_cache[payload.user.id],
				"fallback": "Im On At menu",
				"callback_id": "destiny_imonat_menu",
				"color": menu_color,
				"attachment_type": "default",
				"actions": [
				// Today | Tommorow | Tuesday | Friday | Saturday | Sunday
					{
				    "name": action.gettingon_day,
                    "text": "Day...",
                    "type": "select",
                    "options": [
                        {
                            "text": "Today",
                            "value": "Today"
                        },
						{
                            "text": "Tomorrow",
                            "value": "Tomorrow"
                        },
						{
                            "text": "Tuesday",
                            "value": "Tuesday"
                        },
						{
                            "text": "Friday",
                            "value": "Friday"
                        },
						{
                            "text": "Saturday",
                            "value": "Saturday"
                        },
						{
                            "text": "Sunday",
                            "value": "Sunday"
                        }
					]
					},
				// re-starts custom time sequence
					{
						"name": action.gettingon_start,
						"value": "submit custon",
						"text": "Re-select",
						"type": "button"
					}
				]
			}
		]
	}
	sendMessageToSlackResponseURL(responseURL, message)
}

/* 
*	replaces the original private app message with "message posted"
* 	so that the buttons cannot be pressed again and takes up less space
*/
function clearPrivate(responseURL){
	var message = {
		"replace_original": true,
		"text": "_Message posted._"
	}
	sendMessageToSlackResponseURL(responseURL, message);
}


/* 
*	the basic menu
*/
function sendBasicMenu(responseURL){
	var message = {
		"attachments": [
			{
				"text": "Choose an action:",
				"fallback": "Basic Destiny App Menu",
				"callback_id": "destiny_basic",
				"color": menu_color,
				"attachment_type": "default",
				"actions": [
					{
						"name": action.imon,
						"value": action.imon,
						"text": "I'm On!",
						"type": "button"
					},
					{
						"name": action.gettingon_menu,
						"value": action.gettingon_menu,
						"text": "I'm On At:",
						"type": "button"
					},
					/* {
						"name": action.askgeton,
						"value": action.askgeton,
						"text": "Getting On?",
						"type": "button"
					} */
					// TODO menu type, "others"
					// a menu drop-down of stats, status, etc
				]
			}
		]
	}
	sendMessageToSlackResponseURL(responseURL, message);
}

function debug(message){
	if(_debug){
		console.log(message);
	}
}