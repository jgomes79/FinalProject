module.exports = {
  build: {
    "index.html": "index.html",
    "app.js": "app.js",
    "utils.js": "utils.js",

    "views/": "views/",
    "views/accounts.html": "views/accounts.html",
    "views/projects.html": "views/projects.html",

    "controllers/": "controllers/",
    "controllers/accountsController.js": "controllers/accountsController.js",
    "controllers/projectsController.js": "controllers/projectsController.js",

    "css/": "css/",
    "css/app.css": "css/app.css",
    "css/bootstrap.min.css": "css/bootstrap.min.css",
    "css/angular-ui-notification.min.css": "css/angular-ui-notification.min.css",

    "lib/": "lib/",
    "lib/angular.min.js": "lib/angular.min.js",
    "lib/angular-route.min.js": "lib/angular-route.min.js",
    "lib/angular-ui-notification.min.js": "lib/angular-ui-notification.min.js",

    "services/": "services/",
    "services/accountService.js": "services/accountService.js",
    "services/projectService.js": "services/projectService.js",
  },

  rpc: {
    "host": "localhost",
    "port": 8545
  }
};
