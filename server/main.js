// imports (previously 'require')
import { Meteor } from 'meteor/meteor';
import twit from 'twit';

// collections

Tweets = new Mongo.Collection('Tweets');
Retweets = new Mongo.Collection('Retweets');
Tweeters = new Mongo.Collection('Tweeters');

// Twitter tokens
var T = new twit({
  consumer_key:         '<your key>',
  consumer_secret:      '<your secret>',
  access_token:         '<your token>',
  access_token_secret:  '<your secret token>',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests. 
});

var stream = T.stream('statuses/filter', {track: 'javascript'});
// use Meteor.bindEnvironment so we don't get fiber errors
stream.on('tweet', Meteor.bindEnvironment(function(tweet){
	console.log(tweet.text);
	Tweets.insert(tweet);
	if (tweet.retweeted_status) {
		var rId = tweet.retweeted_status.id;
		Retweets.upsert({retweet_id: rId}, {$inc: {total_retweets: 1}, $set: {original_tweet: tweet.retweeted_status}});
	}
	// also increment a collection of number of tweets by each user 
	// so we don't need to do an expensive search over the whole Tweets collection each time
	Tweeters.upsert({user: tweet.user.id_str}, {$set: {username: tweet.user.screen_name}, $inc: {tweets: 1}});
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
