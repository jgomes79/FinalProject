

app.controller("finalAppAccountsController", [ '$scope', '$location', '$http', '$q', '$window', '$timeout', 'AccountService','Notification', function($scope, $location, $http, $q, $window, $timeout, AccountService, Notification) {

  $scope.accounts = [];
  $scope.activeAccount;

  $scope.$on('$viewContentLoaded', function(){
    initUtils(web3);
  });

	$scope.getAllAccounts = function() {
		web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
			  console.log("There was an error fetching your accounts.");
			  return;
			}

      if (accs && accs.length > 0) {
        $scope.accounts = accs;
        $scope.activeAccount = accs[0];
        $scope.$apply();
      }
    });
  };

  $scope.loginWithAccount = function() {
    AccountService.setActiveAccount($scope.activeAccount);

    $location.path('/projects');
  };

  $scope.accountChanged = function(account) {
    $scope.activeAccount = account;
    $scope.$apply();
  };
}]);
