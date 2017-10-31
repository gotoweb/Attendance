const express = require('express');
const bodyParser = require('body-parser');
const moment = require('moment');
const throttledQ = require('throttled-queue');
const zoomKey = require('./zCreds.json');
const gCreds = require('./gCreds.json');
const zoom = require('zoomus')({
  'key': zoomKey.key,
  'secret': zoomKey.secret
});

const throttle = throttledQ(5, 1000); /*  Limits requests to 5 per second  */

const app = express();
app.use(bodyParser.json());

/* Dashboard type 2 is past, 1 is live meetings. */
let dashboard = {
  type: 2,
  from: moment().format('YYYY-MM-DD'),
  to: moment().format('YYYY-MM-DD'),
}

/* Capitalizes the first letter of the student's name. */
const capitalizeUsername = (username) => {
  if (username.charAt(0) !== username.charAt(0).toUpperCase()) {
    return username.charAt(0).toUpperCase() + username.slice(1);
  }
  return username;
}

/* Accepts array of meeting IDs generated by getMeetings() */
const getDetail = (ids) => {
  console.log('Getting meeting participants...');
  /* Iterates over ids array and updates dashboard for each one with meeting_id: id */
  ids.forEach((id, i) => {
    /* Slows the API requests to avoid rate-limit errors */
    throttle(function() {
      dashboard = {
        meeting_id: id,
        type: 2,
        page_size: 100
      }
      zoom.dashboard.meeting(dashboard, (res) => {
        let thisGroup = [];
        if (res.error) console.log(res.error);
        console.log('Meeting Host: '+res.host);
        let meetingDetail = res.participants;
        if (meetingDetail !== undefined) {
          /* Pass each user_name to CB and push result to thisGroup */
          meetingDetail.forEach((person) => {
            person.user_name = capitalizeUsername(person.user_name);
            if (!thisGroup.includes(person.user_name)) {
              thisGroup.push(person.user_name);
            }
          })
        }
        /* logs list of participants in thisGroup array, sorted alphabetically (case-sensitive) */
        console.log(thisGroup.sort())
      })
    });
  })
}

/* Sends request with default dashboard defined above and gets all meetings of type in dashboard range */
const getMeetings = () => {
  console.log('getting meeting details...');
  zoom.dashboard.meetings(dashboard, (res) => {
    if (res.error) console.log('error');
    let ids = [];
    /* Can I send meetings one at a time to getDetail instead of creating an array? */
    res.meetings.forEach((meeting) => ids.push(meeting.uuid));
    console.log('Getting details for '+ids.length+' meetings...');
    getDetail(ids);
  })
}

getMeetings();
