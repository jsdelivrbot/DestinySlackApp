
var message = {
	originalTs: "123.456",
	originalRu: "http...",
	dateAdded: "1234",
	dateModified: "1234",
	userId: "uid",
	data: "other json"
}

class Message{
	constructor(timestamp, responseUrl, dateAdded, dateModified, userId, msgDataObj, orginalMessage){
		this.timestamp = timestamp;
		this.responseUrl = responseUrl;
		this.dateAdded = dateAdded;
		this.dateModified = dateModified;
		this.userId = userId;
		
		this.messageData = msgDataObj;
		this.orginalMessage = orginalMessage;
		
		/* 
		if(extraData)
			this.messageData = Message.deserializeData(extraData);
		
		if(orginalMessage)
			this.orginalMessage = JSON.parse(orginalMessage); // needs to be stringified when storing
		 */// TODO this may be automaticaly deserialized if stored as string... using class may interupt that
	}
	static deserializeData(dataStr){
		var j = JSON.parse(dataStr);
		return new MessageData(j.join, j.activity, j.time, j.timeZone);
	}
	static serializeData(mesgData){
		var j = {
			join: mesgData.join,
			activity: mesgData.activity,
			time: mesgData.time,
			timeZone: mesgData.timeZone,
		}
		return JSON.stringify(j);
	}
}


var messageData={
	join: {
		hasJoin: true, 		
		buttons: {
			"yes" : {
				uids: [],
				limit: 0
			}
		}
	},
	activity: ["Trials", "Raid"],
	date: 12345,
	localTz: "Central",
}

class MessageData{
	constructor(join, activity, time, timeZone){
		this.join = join;
		this.activity = activity;
		this.time = time;
		this.timeZone = timeZone;
	}
}

module.exports.Message = Message;
module.exports.MessageData = MessageData;
