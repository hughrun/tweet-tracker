// imports (previously 'require')
import { Meteor } from 'meteor/meteor';
import twit from 'twit';

// collections

Tweets = new Mongo.Collection('Tweets');

Meteor.startup(() => {
  // code to run on server at startup
});

// Twitter tokens (for test account)
var T = new twit({
  consumer_key:         '<consumer key>',
  consumer_secret:      '<consumer_secret>',
  access_token:         '<access_token',
  access_token_secret:  '<access_token_secret>',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests. 
});

// var stream = T.stream('statuses/filter', {track: ['#national16','#alia16']});

var stream = T.stream('statuses/filter', {track: 'javascript'});
// use Meteor.bindEnvironment so we don't get fiber errors
stream.on('tweet', Meteor.bindEnvironment(function(tweet){
	var tweetId = tweet.id_str;
	var time = new Date(tweet.created_at);
	// insert into Tweets collection
	Tweets.insert(tweet);
	// update creation time from string to date object so we can use it to filter
	Tweets.update({id_str: tweetId}, {$set: {created_at: time}});	
	
	// store retweets separately
	if (tweet.retweeted_status) {
		var rId = tweet.retweeted_status.id;
		Retweets.upsert({retweet_id: rId}, {$inc: {total_retweets: 1}, $set: {original_tweet: tweet.retweeted_status}});
	}
}));

Meteor.methods({
	todaysTweets: function(now){
		var dataObj = {};
		var tweetsWithTime = Tweets.find({});
		tweetsWithTime.forEach(function(t){
			var time = new Date(t.created_at);
			var yesterday = time - 86400000; // 24hrs ago
			// if the tweet was sent within the last 24 hours, how many blocks of 5 minutes ago was it sent?
			if (time > yesterday) {
				if (time > (now - 300000)){
					if (dataObj['0']) {
							// if it was sent less than 5 mins ago, increment the first listing
							dataObj['0'].total = dataObj['0'].total + 1;
						} else {
							 // ...and if it's the first one, create a new listing for the current 5 min block
							dataObj['0'] = {time: now, total: 1};
						}
					}
					// if the tweet was sent within the last 24 hours, how many blocks of 5 minutes ago was it sent?
					// increment the total as appropriate
					// there are 288 blocks of 5 minutes in 24 hours.
				for (i = 1; i < 289; i++){
					if (time <= (now - (i * 300000)) && time >= (now - ((i+1) * 300000))) {
						for (j = 1; j < 289; j++) {
							if (time <= (now - (j * 300000)) && time >= (now - ((j+1) * 300000))){
					if (dataObj[i]) {
							dataObj[i].total = dataObj[i].total + 1;
						} else {						
							dataObj[i] = {time: time, total: 1};	
						}
							}
						}
					}
				} 
			}
		});
		return dataObj;
	}
});
