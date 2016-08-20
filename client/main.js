// imports
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './main.html';

// collections
Tweets = new Mongo.Collection('Tweets');

Template.retweets.helpers({
  topRetweets(){
  	// get all the tweets sent in the last 24 hours that are retweets
  	var now = new Date();
  	var yesterday = new Date(now - 8.64e+7);
  	// restrict fields to 'retweeted_status' to reduce unnecesary payload
  	var retweets = Tweets.find({created_at: {$gt: yesterday}, retweeted_status: {$exists: true}});
  	
  	// We can't just check the retweeted_status.total_retweets field, because that tells us how many retweets over all time
  	// Instead what we want is how many times we saw it retweeted in the last 24 hours.

  	var rts = {};
 	retweets.forEach(function(t){
 		var original = t.retweeted_status.id_str;
 		if (rts[original]) {
 			rts[original].total++
 		} else {
 			rts[original] = {id: original, user: t.retweeted_status.user.screen_name, text: t.retweeted_status.text, total: 1};
 		}
 	});
 	// sort by number of retweets
  	var retweets = _.sortBy(rts, 'total');
  	// get the last 5 (underscorejs's "_.sortBy" returns them in ascending order)
  	var topRetweets = retweets.slice(-5);
  	// flip the array so the highest number of retweets is at the top
  	topRetweets.reverse();
  	return topRetweets;
  }
});

Template.chatty.helpers({
  topToday(){
  	// this feels like it must be an expensive way to do this, but it works...
  	var now = new Date();
  	var yesterday = new Date(now - 8.64e+7);
  	// get all the tweets sent in the last 24 hours
  	// restrict fields to 'user' to reduce unnecesary payload
  	var todayTweets = Tweets.find({created_at: {$gt: yesterday}}, {fields: {user: 1}});
  	// crate a new object
  	var people = {}
  	// iterate over all the tweets and count up how many were sent by each user
  	// generally we should use the user's id string because they could change their
  	// screen name, but this will only be relevant for 24 hours at a time, and it's 
  	// a pain to go back again to get the current screen name from the id.
  	todayTweets.forEach(function(x){
  		var name = x.user.screen_name;
  		if (people[name]) {
  			people[name].tweets++
  		} else {
  			people[name] = {name: name, tweets: 1};
  		}
  	});
  	// sort by number of tweets
  	var peeps = _.sortBy(people, 'tweets');
  	// get the last 10 (underscorejs's "_.sortBy" returns them in ascending order)
  	var topPeeps = peeps.slice(-10);
  	// flip the array so the highest number of tweets is at the top
  	topPeeps.reverse();
  	return topPeeps;
  }
});

Template.chart.helpers({
  totalTweets() {
  	var now = new Date();
  	var yesterday = new Date(now - 8.64e+7);
  	// get all the tweets sent in the last 24 hours
  	// restrict fields to 'user' to reduce unnecesary payload
  	var allTweets = Tweets.find({created_at: {$gt: yesterday}});
  	return allTweets.count();
  }
});

Template.chart.rendered = function(){

// self-invoking function to draw a new chart every 5 minutes
// it's self-invoking so we get a chart immediately on page load

Meteor.setInterval(function getTweets() {
	var now = new Date();
	Meteor.call('todaysTweets', now, function(error, result){	
		if (error){
			throw error
		}

// put the data inside an array so D3 can deal with it
		var data = _.toArray(result);

// D3 code

		// remove any existing svg
		// if you don't do this, we just get a new chart each time, under the others. Ask me how I know...
		d3.select("svg").remove();

		// Set the dimensions of the canvas / graph
		var margin = {top: 15, right: 15, bottom: 15, left: 15},
	    width = 330 - margin.left - margin.right,
	    height = 260 - margin.top - margin.bottom;

		var x = d3.time.scale().range([0, width]);
		var y = d3.scale.linear().range([height, 0]).nice();

		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom")
			.ticks(3)

		var yAxis = d3.svg.axis()
				.scale(y)
				.ticks(4)
				.orient("right");

		var lineFunction = d3.svg.line()
		    .x(function(d) { return x(d.time) })
		    .y(function(d) { return y(d.total) })
		    .interpolate("basis"); 

		x.domain(d3.extent(data, function(d){ return d.time;}));
		y.domain(d3.extent(data, function(d){ return d.total;}));

		var svg = d3.select("#line-chart")
		.append("svg")
		    .attr("width", width + margin.left + margin.right)
		    .attr("height", height + margin.top + margin.bottom);

		svg.append("path")
		  .attr("class", "line")
		  .attr("d", lineFunction(data))
		  .attr("stroke", "#fdff92")
		  .attr("stroke-width", 1)
		  .attr("fill", "none");

		svg.append("g")
			.attr("class", "x axis")
	        .attr("transform", "translate(0," + height + ")")
	        .call(xAxis);
		
		svg.append("g")
			.attr("class", "y axis")
			.attr("transform", "translate(" + width + ",0)")
			.call(yAxis);				
		});
	return getTweets;
	}(), 300000);	
};
