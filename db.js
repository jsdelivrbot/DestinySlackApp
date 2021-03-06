const pg 		= require('pg');
const logger 	= require('./logger');
pg.defaults.ssl = true;


module.exports.getUsers = function(setUsers) {
	logger.debug('Get Users...');
	
	var users = {}; // populate this map
	
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		logger.debug('Connecting...');
		
		// Handle connection errors
		if(err) {
			done();
			logger.debug(err);
			return res.status(500).json({success: false, data: err});
		}
		
		// SQL Query > Select Data
		logger.debug('Run Query...');
		const query = client
						.query('SELECT * FROM users;')
						.on('row', function(row) {
							logger.debug('Row Id: ' + row.id);
							logger.debug(JSON.stringify(row));
							var uId = row.id;
							var u = {
								"id" :			row.id,
								"name" :		row.name,
								"img_url" :		row.img_url,
								"destiny_name" :row.destiny_name,
								"bungie_id" :	row.bungie_id
							};
							users[uId] = u;
						});
						
		query.on('end', function() {
			done();
			
			logger.debug('Done...');
			logger.debug('Done Method: Users:' + JSON.stringify(users));
			if(setUsers) setUsers(users);
		});
	});
};

// id, name, img_url, destiny_name
module.exports.storeUsers = function(users) {
	logger.debug('Storing Users...');
	logger.debug(JSON.stringify(users, null, 2));
	pg.connect(process.env.DATABASE_URL, (err, client, done) => {
		// Handle connection errors
		if(err) {
			done();
			logger.debug(err);
			return res.status(500).json({success: false, data: err});
		}
		// select all ids
		var ids = [];
		var query = client
					.query('SELECT id FROM users;')
					.on('row', function(row) {
						ids[row.id] = 1;
					});
		// add each user, checkin id to store or insert
		query.on('end', () => {
			logger.debug('Select All Done...');
		
			for(key in users){
				if(key)	logger.debug('User: ' + JSON.stringify(key));
				if(key && users[key].id){
					var user = users[key];
					logger.debug('Storing... '  + user.id + ' ' + ids[user.id]);
						   
					if(ids[user.id]){
						logger.debug('Updating...');
						client.query('UPDATE users SET name=($1), img_url=($2), destiny_name=($3), bungie_id=($4) WHERE id=($5::varchar);',
							[user.name, user.img_url, user.destiny_name, user.bungie_id, user.id],
							function (err, result) {
								logger.debug('Update Full Complete...');
								if (err) {
								  return logger.error('error during Full query: ', err)
								}
							}
					   );
					}else{
						logger.debug('Inserting...');
						client.query('INSERT INTO users(id, name, img_url, destiny_name, bungie_id) ' +
							'VALUES($1, $2, $3, $4, $5);',
							[user.id, user.name, user.img_url, user.destiny_name, user.bungie_id],
								function (err, result) {
									logger.debug('Insert Complete...');
									if (err) {
									  return logger.error('error during query: ' + user.id, err)
									}
								}
						   );
					}
				}
			}
			return;
		});
	});
};



module.exports.getData = function(dbObject, resultMethod) {
	logger.debug('getData...');
	
	var objectMap = {}; // populate this map
	
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		logger.debug('Connecting...');
		
		// Handle connection errors
		if(err) {
			done();
			logger.debug(err);
			return res.status(500).json({success: false, data: err});
		}
		
		// SQL Query > Select Data
		logger.debug('Run Query...');
		const query = client
						.query('SELECT * FROM '+dbObject.tableName+';')
						.on('row', function(row) {
							logger.debug('Row Id: ' + row.id);
							logger.debug(JSON.stringify(row));
							
							var obj = {};
							for(var i = 0; i < dbObject.cols.length; i++){
								obj[dbObject.cols[i].varName] = row[dbObject.cols[i].colName];
							}
							
							objectMap[row.id] = obj;
						});
						
		query.on('end', function() {
			done();
			
			logger.debug('getData Done: ' + dbObject.tableName + ': ' + JSON.stringify(objectMap));
			if(resultMethod) resultMethod(objectMap);
		});
	});
};

