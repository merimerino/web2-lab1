import express from 'express';
import fs, { unwatchFile } from 'fs';
import path from 'path'
import https from 'https';
import { auth, requiresAuth } from 'express-openid-connect'; 
import dotenv from 'dotenv';
import results from './data/results.json';
import schedule from './data/schedule.json';
import bodyParser from 'body-parser';



dotenv.config()

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'pug');

const externalURL = process.env.RENDER_EXTERNAL_URL;

const port = externalURL && process.env.PORT ? parseInt(process.env.PORT) : 4080;
const admin = "gylazuke@decabg.eu"
let counter = 11;

const config = { 
  authRequired : false,
  idpLogout : true, //login not only from the app, but also from identity provider
  secret: process.env.SECRET,
  baseURL: externalURL || `https://localhost:${port}`,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: 'https://web2-labs.eu.auth0.com',
  clientSecret: process.env.CLIENT_SECRET,
  authorizationParams: {
    response_type: 'code' ,
    //scope: "openid profile email"   
   },
};
// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));


app.get('/',  function (req, res) {
  let username : string | undefined;
  let ranking = results.overallranking;
  if (req.oidc.isAuthenticated()) {
    username = req.oidc.user?.name ?? req.oidc.user?.sub;
  }
  res.render('index', {username, ranking,admin});
});

app.get('/private', requiresAuth(), function (req, res) {  
    const username = JSON.stringify(req.oidc.user);
    let user = JSON.parse(username);
    let firstName = user.given_name
    let lastName = user.family_name
    let email = user.email
    console.log(email)
    res.render('private', {username,firstName,lastName, email,admin}); 
});

app.get('/results', function (req, res) {
  let getuser : string | undefined;  
  getuser = JSON.stringify(req.oidc.user);
  let email = undefined;
    if (getuser){    
      let user = JSON.parse(getuser);
      email = user.email}
  let ranking = results.overallranking;
  let username : string | undefined;
  if (req.oidc.isAuthenticated()) {
    username = req.oidc.user?.name ?? req.oidc.user?.sub;
  }
  res.render('results', {username,ranking,admin,email}); 
});

app.post('/results', function (req, res) {
  let getuser : string | undefined;  
  getuser = JSON.stringify(req.oidc.user);
  let email = undefined;
    if (getuser){    
      let user = JSON.parse(getuser);
      email = user.email}
  let ranking = results.overallranking;
  let username : string | undefined;
  if (req.oidc.isAuthenticated()) {
    username = req.oidc.user?.name ?? req.oidc.user?.sub;
  }
  res.render('results', {username,ranking,admin,email}); 
});

app.get('/editResults', function (req, res) {
  let getuser : string | undefined;  
  getuser = JSON.stringify(req.oidc.user);
  let email = undefined;
    if (getuser){    
      let user = JSON.parse(getuser);
      email = user.email}
  let ranking = results.overallranking;
  let username : string | undefined;
  if (req.oidc.isAuthenticated()) {
    username = req.oidc.user?.name ?? req.oidc.user?.sub;
  }
  res.render('editResults', {username,ranking,admin,email}); 
});

app.get('/editComment', function (req, res) {
  let getuser : string | undefined;  
  getuser = JSON.stringify(req.oidc.user);
  let email = undefined;
    if (getuser){    
      let user = JSON.parse(getuser);
      email = user.email}
  let finalSchedule = schedule.schedule;
  let username : string | undefined;
  if (req.oidc.isAuthenticated()) {
    username = req.oidc.user?.name ?? req.oidc.user?.sub;
  }
  var matchID : number | undefined;
  var commentID : number | undefined;
  if(req.query['matchID']){
    matchID= +req.query['matchID'];
    
  }
  if(req.query['edit']){
    commentID= +req.query['edit']
    res.render('editComment', {username,matchID,commentID,finalSchedule,admin,email}); 
    return
  }

  res.render('addComment', {username,matchID,finalSchedule,admin,email}); 
  
    
});

app.post('/addComment', function (req, res) {
  let content = req.body.content;
  let finalSchedule = schedule.schedule
  let getuser : string | undefined;  
  getuser = JSON.stringify(req.oidc.user);
  let email = undefined;
  if (getuser){    
    let user = JSON.parse(getuser);
  email = user.email}
  let ranking = results.overallranking;
  let username : string | undefined;
  if (req.oidc.isAuthenticated()) {
    username = req.oidc.user?.name ?? req.oidc.user?.sub;
  }  
  var matchID : number | undefined;


  if(req.query['edit'] && req.query.edit!==undefined && req.query['matchID']){
    matchID= +req.query['matchID'];
    let commentID = req.query.edit;
    let matchesComments = schedule.schedule[matchID-1]
    let commentsFiltered = matchesComments.commentsSchedule.filter(x => x.commentID == commentID);
    if(commentsFiltered.length){
      matchesComments.commentsSchedule = matchesComments.commentsSchedule.map((r) => { 
        if(r.commentID== commentID){
          r.content = content;
          r.time = new Date().toLocaleString();
        }
        return r
      });
    schedule.schedule[matchID-1]=matchesComments
    fs.writeFileSync('schedule.json', JSON.stringify(schedule.schedule, null, 2));
    res.render("commentsSchedule", {username,matchID,finalSchedule,ranking,admin,email});
    return
    }

  }
  else{

    var matchID : number | undefined;
    if(req.query['matchID']){
      matchID= +req.query['matchID'];
      let matchComments = schedule.schedule[matchID-1]
      matchComments.commentsSchedule.push({
        commentID:counter.toString(),
        username:email,
        time:new Date().toLocaleString(),
        content: content

      })
      counter++;
      schedule.schedule[matchID-1]=matchComments;
      fs.writeFileSync('schedule.json', JSON.stringify(schedule.schedule, null, 2));
    }    
    
    res.render("commentsSchedule", {username,matchID,finalSchedule,ranking,admin,email});}
});



app.post('/addResult', function (req, res) {
  let newResult = JSON.parse(JSON.stringify(req.body));
  let basicComment = {"username": "", "content": ""}
  newResult.commentsResults = basicComment;
  let resultFiltered = results.overallranking.filter(x => x.nationalAssociation == newResult.nationalAssociation);
  if(resultFiltered.length){
    results.overallranking = results.overallranking.filter((r) => { return r.nationalAssociation !== resultFiltered[0].nationalAssociation});
  fs.writeFileSync('results.json', JSON.stringify(results.overallranking, null, 2));
  }

  results.overallranking.push(newResult)
  results.overallranking.sort((one, two) => {
    if (one.totalPoints == two.totalPoints){
      return one.goalDiff > two.goalDiff ? -1 : 1
    }
    return one.totalPoints > two.totalPoints ? -1 : 1
  });

  let getuser : string | undefined;  
  getuser = JSON.stringify(req.oidc.user);
  let email = undefined;
    if (getuser){    
      let user = JSON.parse(getuser);
      email = user.email}
  let ranking = results.overallranking;
  let username : string | undefined;
  if (req.oidc.isAuthenticated()) {
    username = req.oidc.user?.name ?? req.oidc.user?.sub;
  }
  res.render('results', {username,ranking,admin,email});
});



app.get('/schedule', function (req, res) { 
  let getuser : string | undefined;  
  getuser = JSON.stringify(req.oidc.user);
  let email = undefined;
    if (getuser){    
      let user = JSON.parse(getuser);
      email = user.email}       
  let finalSchedule = schedule.schedule;
  let username : string | undefined;
  if (req.oidc.isAuthenticated()) {
    username = req.oidc.user?.name ?? req.oidc.user?.sub;
  }
  res.render('schedule', {username,finalSchedule,admin, email}); 
});


app.get('/commentsResults', requiresAuth(), function (req, res) { 
  let getuser : string | undefined;  
  getuser = JSON.stringify(req.oidc.user);
  let email = undefined;
    if (getuser){    
      let user = JSON.parse(getuser);
      email = user.email}   
  const teamName = req.query.team
 
  let ranking = results.overallranking;
  let username : string | undefined;
  if (req.oidc.isAuthenticated()) {
    username = req.oidc.user?.name ?? req.oidc.user?.sub;
  }
  res.render('commentsResults', {username,teamName,ranking,admin,email}); 
});

app.get('/commentsSchedule', requiresAuth(), function (req, res) { 
  let getuser : string | undefined;  
  getuser = JSON.stringify(req.oidc.user);
  let email = undefined;
    if (getuser){    
      let user = JSON.parse(getuser);
      email = user.email}  
  if(req.query.delete && req.query['matchID']){
    var i : number = +req.query['matchID'];
    schedule.schedule[i - 1].commentsSchedule = schedule.schedule[i - 1].commentsSchedule.filter(x =>  x.commentID != req.query.delete)
    fs.writeFileSync('schedule.json', JSON.stringify(schedule.schedule, null, 2));

  }
  let matchID = req.query.matchID;
  let finalSchedule = schedule.schedule;
  let username : string | undefined;
  if (req.oidc.isAuthenticated()) {
    username = req.oidc.user?.name ?? req.oidc.user?.sub;
  }
  res.render('commentsSchedule', {username,finalSchedule,matchID,admin, email}); 
});

app.post('/commentsSchedule', requiresAuth(), function (req, res) { 
  let getuser : string | undefined;  
  getuser = JSON.stringify(req.oidc.user);
  let email = undefined;
    if (getuser){    
      let user = JSON.parse(getuser);
      email = user.email}  
  if(req.query.delete && req.query['matchID']){
    var i : number = +req.query['matchID'];
    schedule.schedule[i - 1].commentsSchedule = schedule.schedule[i - 1].commentsSchedule.filter(x =>  x.commentID != req.query.delete)
    fs.writeFileSync('schedule.json', JSON.stringify(schedule.schedule, null, 2));

  }
  let matchID = req.query.matchID;
  let finalSchedule = schedule.schedule;
  let username : string | undefined;
  if (req.oidc.isAuthenticated()) {
    username = req.oidc.user?.name ?? req.oidc.user?.sub;
  }
  res.render('commentsSchedule', {username,finalSchedule,matchID,admin, email}); 
});

app.get("/sign-up", (req, res) => {
  res.oidc.login({
    returnTo: '/',
    authorizationParams: {      
      screen_hint: "signup",
    },
  });
});

if(externalURL){
  const hostname = '127.0.0.1';
  https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
  }, app)
  .listen(port, hostname, function () {
    console.log(`Server running at https://${hostname}:${port}/ and from outside on ${externalURL}`);
  });
}else {
  https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
  }, app)
  .listen(port, function () {
    console.log(`Server running at https://localhost:${port}/`);
  });
}