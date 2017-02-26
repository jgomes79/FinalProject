app.controller("finalAppProjectsController", [ '$scope', '$location', '$http', '$q', '$window', '$timeout', 'AccountService', 'ProjectService','Notification', function($scope, $location, $http, $q, $window, $timeout, AccountService, ProjectService, Notification) {

  $scope.projects = [];
  $scope.project;
  $scope.newProject;
  $scope.contributeAmmount;
  $scope.selectedProject;

	$scope.getAllProjects = function() {
    $scope.projects = [];
    $scope.projectsData = [];

    FundingHub.deployed().getProjectsCount.call().then(function (count) {
      ProjectService.setProjectsCount(count.valueOf());
      if (count.valueOf() > 0) {
        for (var i=0;i<count.valueOf();i++) {
          return FundingHub.deployed().projectsData.call(i).then(function (pd) {
            $timeout(function() {
              $scope.projects.push({
                title: pd[0],
                projectAddress: pd[1]
              });
              $scope.projectsData.push(pd);
            });
          });
        }

        ProjectService.setProjects($scope.projectsData);
        ProjectService.setProjectsCount(count.valueOf());
      }
    });
  }

  $scope.projectChanged = function(project) {
    $scope.selectedProject = angular.fromJson(project);
    ProjectService.setActiveProject(angular.fromJson(project));
    $scope.$apply();
  };

  $scope.addProject = function() {
    var fundingHub = FundingHub.deployed();
    var events = fundingHub.allEvents('latest',function(error, log) {
      if (!error) {
        switch (log.event) {
          case 'OnCreateProject':
            Notification("Project added!!!!");
            $scope.getAllProjects();
            $scope.$apply();
            break;
          default:
            break;
        }
      }
      events.stopWatching();
    });

    fundingHub.createProject($scope.newProject.ammountToRaise,$scope.newProject.deadline,$scope.newProject.name,$scope.newProject.description, {from: AccountService.getActiveAccount(), gas: 3000000})
      .then(function (tx) {
        return web3.eth.getTransactionReceiptMined(tx);
      })
      .then(function (receipt) {
        console.log("Project created");
      })
      .catch(function (e) {
        Notification("error adding a project: " + e);
      });
  };

  $scope.contribute = function() {
    var fundingHub = FundingHub.deployed();
    var events = fundingHub.allEvents('latest',function(error, log) {
      if (!error) {
        switch (log.event) {
          case 'OnContribute':
            Notification("Contribute to project!!!!");
            break;
          case 'OnContributeFail':
            Notification("Contribute failed");
            break;
          default:
            break;
        }
      }
      events.stopWatching();
    });

    console.log(ProjectService.getActiveProject());
    console.log(ProjectService.getActiveProject().title);
    console.log(ProjectService.getActiveProject().projectAddress);
    console.log($scope.contributeAmmount);

    fundingHub.contribute(ProjectService.getActiveProject().projectAddress,$scope.contributeAmmount, {from: AccountService.getActiveAccount(), gas: 3000000})
      .then(function (tx) {
        return web3.eth.getTransactionReceiptMined(tx);
      })
      .then(function (receipt) {
        console.log("Contribute to project!!!!");
      })
      .catch(function (e) {
        Notification("error contributing to the project: " + e);
      });
  }
}]);
