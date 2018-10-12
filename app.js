/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var bodyParser = require('body-parser'); 

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();
var cloudant, mydb, client_id;
var churn_num = 0;
var client;




app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: false }));
// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

////////////////// PREDICTION ////////////////////////////////////////////////////////////////////////////////////////////////////


 //// ************* Conde snippet  *************** ////

const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const btoa = require("btoa");
const wml_credentials = new Map();

// NOTE: you must manually construct wml_credentials hash map below using information retrieved
// from your IBM Cloud Watson Machine Learning Service instance
var wml_service_credentials_url ='<url>'; // TO COMPLETE
var wml_service_credentials_username = '<username>'; // TO COMPLETE
var wml_service_credentials_password = '<password>'; // TO COMPLETE


wml_credentials.set("url", wml_service_credentials_url);
wml_credentials.set("username", wml_service_credentials_username);
wml_credentials.set("password", wml_service_credentials_password);


function apiGet(url, username, password, loadCallback, errorCallback){
  const oReq = new XMLHttpRequest();
  const tokenHeader = "Basic " + btoa((username + ":" + password));
  const tokenUrl = url + "/v3/identity/token";

  oReq.addEventListener("load", loadCallback);
  oReq.addEventListener("error", errorCallback);
  oReq.open("GET", tokenUrl);
  oReq.setRequestHeader("Authorization", tokenHeader);
  oReq.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  oReq.send();
}

function apiPost(scoring_url, token, payload, loadCallback, errorCallback){
  const oReq = new XMLHttpRequest();
  oReq.addEventListener("load", loadCallback);
  oReq.addEventListener("error", errorCallback);
  oReq.open("POST", scoring_url);
  oReq.setRequestHeader("Accept", "application/json");
  oReq.setRequestHeader("Authorization", token);
  oReq.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  oReq.send(payload);
}




  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function initClients (clients) {
  
  if(!mydb) {
    console.log("No database.");
   
    return;
  }
  console.log (clients.length);

  for(var i=0;i<clients.length;i++){
  	mydb.insert(clients[i]) ;

  }
  
}

app.get("/client/churn", function (request, response) {
  apiGet(wml_credentials.get("url"),
    wml_credentials.get("username"),
    wml_credentials.get("password"),
    function (res) {
          let parsedGetResponse;
          try {
              parsedGetResponse = JSON.parse(this.responseText);
          } catch(ex) {
              // TODO: handle parsing exception
          }
          if (parsedGetResponse && parsedGetResponse.token) {
              const token = parsedGetResponse.token
              const wmlToken = "Bearer " + token;

              // NOTE: manually define and pass the array(s) of values to be scored in the next line
        const payload = '{"fields": ["Gender", "Status", "Children", "Est Income", "Car Owner", "Age", "LongDistance", "International", "Local", "Dropped", "Paymethod", "LocalBilltype", "LongDistanceBilltype", "Usage", "RatePlan"], "values": [[  '+JSON.stringify(client.gender)+', '+JSON.stringify(client.status)+', '+JSON.stringify(client.children)+','+JSON.stringify(client.est_income)+','+JSON.stringify(client.car_owner)+','+JSON.stringify(client.age)+','+JSON.stringify(client.long_distance)+','+JSON.stringify(client.international)+','+JSON.stringify(client.local)+','+JSON.stringify(client.dropped)+', '+JSON.stringify(client.paymethod)+', '+JSON.stringify(client.local_billtype)+','+JSON.stringify(client.longdistance_billtype)+','+JSON.stringify(client.usage)+', '+JSON.stringify(client.rate_plan)+']]}';
        console.log(payload);
        // TO COMPLETE
        const scoring_url = "https://us-south.ml.cloud.ibm.com/v3/wml_instances/<yourinstance>/deployments/<yourdeployment>/online";

              apiPost(scoring_url, wmlToken, payload, function (resp) {
                  let parsedPostResponse;
                  try {
                      parsedPostResponse = JSON.parse(this.responseText);
                  } catch (ex) {
                      // TODO: handle parsing exception
                  }
                  console.log("Scoring response");
                  console.log(parsedPostResponse);
                  response.json(parsedPostResponse);
              }, function (error) {
                  console.log(error);
              });
          } else {
              console.log("Failed to retrieve Bearer token");
          }
    }, function (err) {
      console.log(err);
    }); 
  
});

app.get("/getClients", function (request, response) {
  var clients = [];
  if(!mydb) {
    response.json(clients);
    return;
  }

  mydb.list({ include_docs: true }, function(err, body) {
    if (!err) {
      body.rows.forEach(function(row) {
        if(row.doc.id){
        	clients.push(row.doc);
        	console.log(row.doc.id);
        }
          

      });
      response.json(clients);
    }
  });
});

app.post('/clientid', function(req, res){
  client_id = req.body.id;
  res.sendFile(__dirname + '/public/page1.html');
});
app.get('/clientid', function(req, res){

  res.sendFile(__dirname + '/public/page1.html');
});

app.get('/client/id', function(req, res){

    

    if(!mydb) {
      res.json("no data");
      return;
    }

    mydb.list({ include_docs: true }, function(err, body) {
      if (!err) {
        body.rows.forEach(function(row) {
          if(row.doc.id == client_id){
            client = row.doc;
            res.json(row.doc);
            console.log(row.doc);
          }
        });

        
      } else{
        res.json("Client does not exist");
      }
    });



});
// load local VCAP configuration  and service credentials
var vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
  console.log("Loaded local VCAP", vcapLocal);
} catch (e) { }

// get the app environment from Cloud Foundry
const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}
const appEnv = cfenv.getAppEnv(appEnvOpts);
// Load the Cloudant library.
var Cloudant = require('@cloudant/cloudant');
if (appEnv.services['cloudantNoSQLDB'] || appEnv.getService(/cloudant/)) {

  // Initialize database with credentials
  if (appEnv.services['cloudantNoSQLDB']) {
    // CF service named 'cloudantNoSQLDB'
    cloudant = Cloudant(appEnv.services['cloudantNoSQLDB'][0].credentials);
  } else {
     // user-provided service with 'cloudant' in its name
     cloudant = Cloudant(appEnv.getService(/cloudant/).credentials);
  }
} else if (process.env.CLOUDANT_URL){
  cloudant = Cloudant(process.env.CLOUDANT_URL);
}
if(cloudant) {
  //database name
  var dbName = 'mydb';

  // Create a new "mydb" database.
  cloudant.db.create(dbName, function(err, data) {
    if(!err){
    	//err if database doesn't already exists
      console.log("Created database: " + dbName);
  	  var client1 =  { "id" : 2048, "gender": "F", "status" : "S", "children" : 1.000000, "est_income" : 13576.500000, "car_owner" : "N", "age" : 39.426667, "long_distance" : 14.830000, "international" : 0.000000, "local" : 25.660000, "dropped" : 0.000000, "paymethod" : "CC", "local_billtype" : "Budget", "longdistance_billtype" : "Standard", "usage" : 40.490000, "rate_plan" : 1.000000 };
  	  var client2 =  { "id" : 2054, "gender": "F", "status" : "M", "children" : 2.000000, "est_income" : 84166.100000, "car_owner" : "N", "age" : 54.013333, "long_distance" : 3.280000, "international" : 0.000000, "local" : 11.740000, "dropped" : 1.000000, "paymethod" : "CC", "local_billtype" : "Budget", "longdistance_billtype" : "Standard", "usage" : 15.020000, "rate_plan" : 2.000000 };
  	  var client3 =  { "id" : 2075, "gender": "F", "status" : "S", "children" : 0.000000, "est_income" : 68427.400000, "car_owner" : "N", "age" : 42.393333, "long_distance" : 23.760000, "international" : 0.000000, "local" : 50.050000, "dropped" : 0.000000, "paymethod" : "Auto", "local_billtype" : "FreeLocal", "longdistance_billtype" : "Standard", "usage" : 73.810000, "rate_plan" : 3.000000 };
  	  var client4 =  { "id" : 2095, "gender": "F", "status" : "M", "children" : 2.000000, "est_income" : 77551.100000, "car_owner" : "N", "age" : 33.600000, "long_distance" : 20.530000, "international" : 0.000000, "local" : 41.890000, "dropped" : 1.000000, "paymethod" : "CC", "local_billtype" : "Budget", "longdistance_billtype" : "Intnl_discount", "usage" : 62.420000, "rate_plan" : 2.000000 };
  	  var client5 =  { "id" : 2108, "gender": "F", "status" : "S", "children" : 1.000000, "est_income" : 13109.100000, "car_owner" : "Y", "age" : 62.606667, "long_distance" : 22.380000, "international" : 0.000000, "local" : 40.480000, "dropped" : 0.000000, "paymethod" : "Auto", "local_billtype" : "Budget", "longdistance_billtype" : "Standard", "usage" : 62.870000, "rate_plan" : 1.000000 };
  	  var client6 =  { "id" : 2124, "gender": "M", "status" : "M", "children" : 2.000000, "est_income" : 1765.410000, "car_owner" : "N", "age" : 18.766667, "long_distance" : 3.040000, "international" : 0.000000, "local" : 115.660000, "dropped" : 0.000000, "paymethod" : "CC", "local_billtype" : "FreeLocal", "longdistance_billtype" : "Standard", "usage" : 47.990000, "rate_plan" : 4.000000 };
  	  var client7 =  { "id" : 2154, "gender": "M", "status" : "S", "children" : 0.000000, "est_income" : 65000.000000, "car_owner" : "Y", "age" : 45.653333, "long_distance" : 11.630000, "international" : 9.700000, "local" : 90.180000, "dropped" : 1.000000, "paymethod" : "Auto", "local_billtype" : "FreeLocal", "longdistance_billtype" : "Intnl_discount", "usage" : 137.000000, "rate_plan" : 4.000000 };
  	  var client8 =  { "id" : 2218, "gender": "F", "status" : "M", "children" : 0.000000, "est_income" : 83287.000000, "car_owner" : "N", "age" : 45.486667, "long_distance" : 29.640000, "international" : 0.000000, "local" : 65.090000, "dropped" : 4.000000, "paymethod" : "Auto", "local_billtype" : "FreeLocal", "longdistance_billtype" : "Intnl_discount", "usage" : 119.820000, "rate_plan" : 3.000000 };
  	  var client9 =  { "id" : 2267, "gender": "F", "status" : "M", "children" : 2.000000, "est_income" : 63566.100000, "car_owner" : "Y", "age" : 56.300000, "long_distance" : 7.940000, "international" : 0.000000, "local" : 137.190000, "dropped" : 0.000000, "paymethod" : "CH", "local_billtype" : "Budget", "longdistance_billtype" : "Intnl_discount", "usage" : 73.030000, "rate_plan" : 2.000000 };
  	  var client10 =  { "id" : 2284, "gender": "F", "status" : "S", "children" : 2.000000, "est_income" : 19008.400000, "car_owner" : "Y", "age" : 52.166667, "long_distance" : 10.540000, "international" : 0.000000, "local" : 137.190000, "dropped" : 0.000000, "paymethod" : "CC", "local_billtype" : "FreeLocal", "longdistance_billtype" : "Standard", "usage" : 147.740000, "rate_plan" : 4.000000 };
  	  var clients = [client1, client2, client3, client4, client5, client6, client7, client8, client9, client10];
  	  initClients(clients);
  	  
    } 
  });

  // Specify the database we are going to use (mydb)...
  mydb = cloudant.db.use(dbName);

}

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
