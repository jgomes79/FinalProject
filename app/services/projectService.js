app.factory('ProjectService', function() {
  var activeProject;
  var projectsCount;
  var projects;

  return {
    setActiveProject: setActiveProject,
    getActiveProject: getActiveProject,

    setProjectsCount: setProjectsCount,
    getProjectsCount: getProjectsCount,

    setProjects: setProjects,
    getProjects: getProjects
  };

  function setActiveProject(project) {
    activeProject = project;
  }

  function getActiveProject() {
    return activeProject;
  }

  function setProjectsCount(count) {
    projectsCount = count;
  }

  function getProjectsCount() {
    return projectsCount;
  }

  function setProjects(projects) {
    projects = projects;
  }

  function getProjects() {
    return projects;
  }

});
