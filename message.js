
var message = {
	originalTs: "123.456",
	originalRu: "http...",
	dateAdded: "1234",
	dateModified: "1234",
	userId: "uid",
	data: "other json"
}

class Message{
	constructor(timestamp, responseUrl, dateAdded, dateModified, userId, data){
		this.timestamp = timestamp;
		this.responseUrl = responseUrl;
		this.dateAdded = dateAdded;
		this.dateModified = dateModified;
		this.userId = userId;
		this.data = data;
		
		this.messageData = Message.deserializeData(this.data);
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
var origMesCache = {
	
}

var messageData={
	join: {
		hasJoin: true, 
		hasNo: true, 
		hasMaybe: true, 
		hasStandby: true, 
		hasYesLimit: true,
		joins: ["Uid1"],
		yess: ["Uid1"],
		nos: ["Uid1"],
		maybes: ["Uid1"],
		yesLimit: 6,
	},
	activity: ["Trials", "Raid"...],
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
// origMesCache[message.originalTs] = message;
// update cache

// store cache

// refresh cache

// remove stale from cache