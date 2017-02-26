var app = angular.module('finalApp', ['ngRoute','ui-notification']);

app.config(['$routeProvider', function($routeProvider) {
  $routeProvider
      .when('/accounts', {
          templateUrl : 'views/accounts.html',
          controller  : 'finalAppAccountsController'
      })
      .when('/projects', {
          templateUrl : 'views/projects.html',
          controller  : 'finalAppProjectsController'
      })
      .otherwise({
          redirectTo: '/accounts'
      });
}]);

app.config(function(NotificationProvider) {
            NotificationProvider.setOptions({
                delay: 5000,
                startTop: 20,
                startRight: 10,
                verticalSpacing: 20,
                horizontalSpacing: 20,
                positionX: 'right',
                positionY: 'bottom'
            });
});
