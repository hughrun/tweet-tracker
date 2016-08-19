// imports
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './main.html';

// collections
Tweets = new Mongo.Collection('Tweets');
Retweets = new Mongo.Collection('Retweets');
Tweeters = new Mongo.Collection('Tweeters');

Template.retweets.helpers({
  topTweet(){
  	var highest = Retweets.find({},{sort: {total_retweets:-1}, limit: 5});
  	return highest;
  },
});

Template.chatty.helpers({
  topTweeters(){
  	var top = Tweeters.find({}, {sort: {tweets:-1}, limit: 5});
  	return top;
  }
});

Template.chart.helpers({
  totalTweets() {
  	var allTweets = Tweets.find();
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
			.ticks(4)

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
