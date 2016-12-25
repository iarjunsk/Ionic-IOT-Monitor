angular.module('app.controllers', [])

  .controller('loginCtrl', function($scope,$rootScope,$ionicHistory,sharedUtils,$state,$ionicSideMenuDelegate) {
    $rootScope.extras = false;  // For hiding the side bar and nav icon

    // When the user logs out and reaches login page,
    // we clear all the history and cache to prevent back link
    $scope.$on('$ionicView.enter', function(ev) {
      if(ev.targetScope !== $scope){
        $ionicHistory.clearHistory();
        $ionicHistory.clearCache();
      }
    });

    //Check if user already logged in
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {

        $ionicHistory.nextViewOptions({
          historyRoot: true
        });
        $ionicSideMenuDelegate.canDragContent(true);  // Sets up the sideMenu dragable
        $rootScope.extras = true;
        sharedUtils.hideLoading();
        $state.go('topicsList', {}, {location: "replace"});

      }
    });


    $scope.loginEmail = function(formName,cred) {


      if(formName.$valid) {  // Check if the form data is valid or not

        sharedUtils.showLoading();

        //Email
        firebase.auth().signInWithEmailAndPassword(cred.email,cred.password).then(function(result) {

            // You dont need to save the users session as firebase handles it
            // You only need to :
            // 1. clear the login page history from the history stack so that you cant come back
            // 2. Set rootScope.extra;
            // 3. Turn off the loading
            // 4. Got to menu page

            $ionicHistory.nextViewOptions({
              historyRoot: true
            });
            $rootScope.extras = true;
            sharedUtils.hideLoading();
            $state.go('topicsList', {}, {location: "replace"});

          },
          function(error) {
            sharedUtils.hideLoading();
            sharedUtils.showAlert("Please note","Authentication Error");
          }
        );

      }else{
        sharedUtils.showAlert("Please note","Entered data is not valid");
      }

    };

  })

  .controller('signupCtrl', function($scope,$rootScope,sharedUtils,$ionicSideMenuDelegate,
                                     $state,fireBaseData,$ionicHistory) {
    $rootScope.extras = false; // For hiding the side bar and nav icon

    $scope.signupEmail = function (formName, cred) {

      if (formName.$valid) {  // Check if the form data is valid or not

        sharedUtils.showLoading();

        //Main Firebase Authentication part
        firebase.auth().createUserWithEmailAndPassword(cred.email, cred.password).then(function (result) {

          //Registered OK
          $ionicHistory.nextViewOptions({
            historyRoot: true
          });
          $ionicSideMenuDelegate.canDragContent(true);  // Sets up the sideMenu dragable
          $rootScope.extras = true;
          sharedUtils.hideLoading();
          $state.go('topicsList', {}, {location: "replace"});

        }, function (error) {
          sharedUtils.hideLoading();
          sharedUtils.showAlert("Please note","Sign up Error");
        });

      }else{
        sharedUtils.showAlert("Please note","Entered data is not valid");
      }

    }

  })

  .controller('topicsCtrl', function($scope,$rootScope,$ionicSideMenuDelegate,
                                     fireBaseData,$state,$ionicPopup,$firebaseObject,
                                     $ionicHistory,$firebaseArray,sharedUtils) {

    //Check if user already logged in
    sharedUtils.showLoading();
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        $scope.user_info=user;
        $scope.topics= $firebaseArray(fireBaseData.refMqtt().child(user.uid).child("topics"));

        $scope.topics.$loaded().then(function(data) {   //Calls when the firebase data is loaded
          sharedUtils.hideLoading();
        }, 500);

      }else {

        $ionicSideMenuDelegate.toggleLeft(); //To close the side bar
        $ionicSideMenuDelegate.canDragContent(false);  // To remove the sidemenu white space

        $ionicHistory.nextViewOptions({
          historyRoot: true
        });
        $rootScope.extras = false;
        sharedUtils.hideLoading();
        $state.go('tabsController.login', {}, {location: "replace"});
        sharedUtils.hideLoading();
      }
    });

    // On Loggin in to menu page, the sideMenu drag state is set to true
    $ionicSideMenuDelegate.canDragContent(true);
    $rootScope.extras=true;

    // When user visits A-> B -> C -> A and clicks back, he will close the app instead of back linking
    $scope.$on('$ionicView.enter', function(ev) {
      if(ev.targetScope !== $scope){
        $ionicHistory.clearHistory();
        $ionicHistory.clearCache();
      }
    });

    //Edit section
    $scope.itemManipulation = function(edit_val) {  // Takes care of item add and edit ie Item Manipulator
      var title,sub_title;
      if(edit_val!=null) {
        $scope.data=null;
        $scope.data = edit_val; // For editing address
        title="Edit Topic";
        sub_title="Edit your Topic";
      }
      else {
        $scope.data = {};    // For adding new address
        title="Add Topic";
        sub_title="Add a new topic";
      }
      // An elaborate, custom popup
      var connectionPopup = $ionicPopup.show({
        template: '<input type="text"   placeholder="Topic"  ng-model="data.topic"> <br/> ' +
                  '<input type="text"   placeholder="Info" ng-model="data.info"> <br/> '+
                  '<input type="text"   placeholder="Image (Optional)"  ng-model="data.img"> <br/> ',
        title: title,
        subTitle: sub_title,
        scope: $scope,
        buttons: [
          { text: 'Close' },
          {
            text: '<b>Save</b>',
            type: 'button-positive',
            onTap: function(e) {
              if ( !$scope.data.topic || !$scope.data.info  ) {
                e.preventDefault(); //don't allow the user to close unless he enters full details
              } else {
                return $scope.data;
              }
            }
          }
        ]
      });

      connectionPopup.then(function(res) {

        if(edit_val!=null) {
          //Update  address
          if(res!=null) { //res == null => close()
            if(!res.img){ res.img="topic_bg_default.jpg";  }
            fireBaseData.refMqtt().child($scope.user_info.uid).child("topics").child(edit_val.$id).update({    // set
              topic: res.topic,
              info: res.info,
              img:res.img
            });
          }
        }else{
          //Add new address
          if(res!=null) {
            if (!res.img) {res.img = "topic_bg_default.jpg";}
            fireBaseData.refMqtt().child($scope.user_info.uid).child("topics").push({    // set
              topic: res.topic,
              info: res.info,
              img: res.img
            });
          }
        }

      });

    };

    // A confirm dialog for deleting topic
    $scope.deleteTopic = function(del_id) {
      var confirmPopup = $ionicPopup.confirm({
        title: 'Delete Topic',
        template: 'Are you sure you want to delete this topic',
        buttons: [
          { text: 'No' , type: 'button-stable' },
          { text: 'Yes', type: 'button-assertive' , onTap: function(){return del_id;} }
        ]
      });

      confirmPopup.then(function(res) {
        if(res) {
          fireBaseData.refMqtt().child($scope.user_info.uid).child("topics").child(res).remove();
        }
      });
    };

    $scope.view_graph=function(c_id){
      fireBaseData.refMqtt().child($scope.user_info.uid).update({ currentTopic: c_id }); //set the current topic
      $state.go('graph', {}, {location: "replace"}); //move to graph page
    };

  })

  .controller('indexCtrl', function($scope,$rootScope,sharedUtils,$ionicHistory,$state,$ionicSideMenuDelegate) {

    //Check if user already logged in
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        $scope.user_info=user; //Saves data to user_info
      }else {

        $ionicSideMenuDelegate.toggleLeft(); //To close the side bar
        $ionicSideMenuDelegate.canDragContent(false);  // To remove the sidemenu white space

        $ionicHistory.nextViewOptions({
          historyRoot: true
        });
        $rootScope.extras = false;
        sharedUtils.hideLoading();
        $state.go('tabsController.login', {}, {location: "replace"});

      }
    });

    $scope.logout=function(){

      sharedUtils.showLoading();

      // Main Firebase logout
      firebase.auth().signOut().then(function() {

        $ionicSideMenuDelegate.toggleLeft(); //To close the side bar
        $ionicSideMenuDelegate.canDragContent(false);  // To remove the sidemenu white space

        $ionicHistory.nextViewOptions({
          historyRoot: true
        });


        $rootScope.extras = false;
        sharedUtils.hideLoading();
        $state.go('tabsController.login', {}, {location: "replace"});

      }, function(error) {
        sharedUtils.showAlert("Error","Logout Failed")
      });

    }

  })

  .controller('compareAllCtrl', function($scope,$rootScope) {
    //For compare All
  })

  .controller('settingsCtrl', function($scope,$rootScope,fireBaseData,$firebaseObject,
                                       $ionicPopup,$state,$window,$firebaseArray,
                                       sharedUtils) {
    //Bugs are most prevailing here
    $rootScope.extras=true;
    //Shows loading bar
    sharedUtils.showLoading();
    //Check if user already logged in
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        $scope.mqtt= $firebaseObject(fireBaseData.refMqtt().child(user.uid));
        $scope.user_info=user; //gives user id

        $scope.mqtt.$loaded().then(function(data) {   //Calls when the firebase data is loaded
          sharedUtils.hideLoading();
        }, 500);

      }
    });


    $scope.save= function (mqttRef) {

      if(mqttRef.username=="" || mqttRef.username==null){
        mqttRef.username="";
        mqttRef.password="";
      }
      client_id="myClientId" + new Date().getTime();
      if( (mqttRef.url!="" && mqttRef.url!=null ) &&
          (mqttRef.port!="" && mqttRef.port!=null )
        ){
        fireBaseData.refMqtt().child($scope.user_info.uid).update({
          url: mqttRef.url,
          port: mqttRef.port,
          username: mqttRef.username,
          password: mqttRef.password,
          ssl: mqttRef.ssl,
          clientId:client_id,
          currentTopic:""
        });
      }

    };

    $scope.cancel=function(){
      $window.location.reload(true);
    }

  })

  .controller('supportCtrl', function($scope,$rootScope) {

    $rootScope.extras=true;

  })

  .controller('graphCtrl', function($scope,$rootScope,fireBaseData,
                                    $firebaseObject,sharedUtils) {

    sharedUtils.showLoading(); // starts with loading bar

    /*--------------------------------FIREBASE---------------------------*/
    $rootScope.extras=true;
    //var mqttData;
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        mqttData=$firebaseObject(fireBaseData.refMqtt().child(user.uid));  //Mqtt data
        mqttData.$loaded().then(function(data) {   //Calls when the firebase data is loaded
            $scope.MQTTconnect();
          }, 500);

      }
    });
    /*--------------------------------END OF FIREBASE---------------------------*/




    /*--------------------------------MQTT---------------------------*/
    //MQTT variables
    var client;
    var reconnectTimeout = 2000;

    $scope.MQTTconnect=function() {

      console.log("START");
      client = new Paho.MQTT.Client(
        mqttData.url,
        Number(mqttData.port),
        mqttData.clientId  //Client Id
      );

      client.onConnectionLost = onConnectionLost;
      client.onMessageArrived = onMessageArrived;

      var options = {
        timeout: 3,
        useSSL:mqttData.ssl,
        onSuccess:onConnect,
        onFailure:doFail
      };

      if(mqttData.username!="" ){
        options.userName=mqttData.username;
        options.password=mqttData.password;
      }

      console.log("TXSS",options);
      client.connect(options);
    };

    function onConnect() {
      sharedUtils.hideLoading();
      console.log("onConnect");
      client.subscribe(mqttData.currentTopic);
    }

    function doFail(e){
      sharedUtils.hideLoading();
      console.log("Error",e);
      sharedUtils.showAlert("Configuration Error","Check if the port is for web-socket!");
      //setTimeout($scope.MQTTconnect, reconnectTimeout);
    }

    // called when the client loses its connection
    function onConnectionLost(responseObject) {
      if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:"+responseObject.errorMessage);
        sharedUtils.showLoading();
        //setTimeout($scope.MQTTconnect, reconnectTimeout);
      }
    }

    // called when a message arrives
    function onMessageArrived(message) {
      if(Number(message.payloadString)>0) { //-ve number are reserved for notification
        $scope.addPoint(Number(message.payloadString));
      }
    }
    /*--------------------------------END OF MQTT---------------------------*/






    /*--------------------------------GRAPH---------------------------*/

    var ISTOffset = 330;   // IST offset UTC +5:30

    var options = {
      chart: {
        renderTo: 'container',
        type: 'spline',
        animation: Highcharts.svg, // don't animate in old IE
        marginRight: 30
      },
      title: {
        text: 'Live Sensor data'
      },
      xAxis: {
        type: 'datetime',
        tickPixelInterval: 150
      },
      yAxis: {
        title: {
          text: 'Value'
        }
      },
      tooltip: {
        formatter: function () {
          return '<b>' + this.series.name + '</b><br/>' +
            Highcharts.dateFormat('%H:%M:%S', this.x) + '<br/>' +
            Highcharts.numberFormat(this.y, 2);
        }
      },
      legend: {
        enabled: false
      },
      exporting: {
        enabled: false
      },
      series: [{
        name: 'Sensor data',
        data: (function () {
              var data = [],
                  time = moment().tz("Asia/Kolkata").valueOf()+(ISTOffset*60000),
                  i;

              for (i = -19; i <= 0; i += 1) {
                data.push({
                  x: time + i * 1000,
                  y: null
                });
              }
              return data;
            }())
      }]

    };

    var chart = Highcharts.chart(options);


    $scope.addPoint = function (point) {
      chart.series[0].addPoint(
          [
            moment().tz("Asia/Kolkata").valueOf()+(ISTOffset*60000),
            point
          ],true,true
      );
    };

    $scope.notify=function(){
      message = new Paho.MQTT.Message("-1"); // -1 => Notify
      message.destinationName = mqttData.currentTopic;
      client.send(message);
    };

  });

    /*--------------------------------END OF GRAPH---------------------------*/




