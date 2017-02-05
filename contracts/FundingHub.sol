pragma solidity ^0.4.2;

import "Project.sol";

contract FundingHub {
  mapping (address => Project) public projects;
  address[] public projectIds;

  event OnCreateProject(uint ammount, uint deadline, string title, string description, address projectAddress);
  event OnContribute(address projectAddress, uint256 ammount);
  event OnContributeFail();

  function createProject(uint ammount, uint deadline, string title, string description) {
    Project newProject = new Project(ammount,deadline,title,description);
    address projectAddress = address(newProject);
    projects[projectAddress] = newProject;

    OnCreateProject(ammount, deadline, title, description, projectAddress);
  }

  function contribute(address projectAddress, uint256 ammount) {
    if (ammount <= 0) throw;

    if (projects[projectAddress].send(ammount)) {
      OnContribute(projectAddress,ammount);
    } else {
      OnContributeFail();
    }
  }
}
