pragma solidity ^0.4.2;

import "Project.sol";

contract FundingHub {

  struct BasicProjectData {
    string title;
    address projectAddress;
  }

  mapping (address => Project) public projects;
  BasicProjectData[] public projectsData;

  event OnCreateProject(uint ammount, uint deadline, string title, string description, address projectAddress);
  event OnContribute(address projectAddress, uint256 ammount);
  event OnContributeFail();

  function createProject(uint ammount, uint deadline, string title, string description) {
    Project newProject = new Project(ammount,deadline,title,description);
    address projectAddress = address(newProject);
    projects[projectAddress] = newProject;

    BasicProjectData memory pd = BasicProjectData(title,projectAddress);
    projectsData.push(pd);
    OnCreateProject(ammount, deadline, title, description, projectAddress);
  }

  function contribute(address projectAddress, uint256 ammount) payable {
    if (ammount <= 0) throw;

    if (projects[projectAddress].fund(ammount)) {
      OnContribute(projectAddress,ammount);
    } else {
      OnContributeFail();
    }
  }

  function getProjectsCount() constant returns (uint count) {
    return projectsData.length;
  }
}
