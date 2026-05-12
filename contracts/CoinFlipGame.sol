// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CoinFlipGame {
    address public owner;
    uint256 public totalFlips;

    event HouseFunded(address indexed funder, uint256 amount);
    event CoinFlipped(
        address indexed player,
        uint256 wager,
        bool choiceHeads,
        bool resultHeads,
        bool won,
        uint256 payout
    );
    event OwnerWithdrawal(address indexed owner, uint256 amount);

    constructor() payable {
        owner = msg.sender;

        if (msg.value > 0) {
            emit HouseFunded(msg.sender, msg.value);
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    function fundHouse() external payable {
        require(msg.value > 0, "Send ETH to fund the house");
        emit HouseFunded(msg.sender, msg.value);
    }

    function flip(bool choiceHeads) external payable {
        require(msg.value > 0, "Wager must be greater than 0");

        uint256 payout = msg.value * 2;
        require(address(this).balance >= payout, "House needs more ETH");

        totalFlips += 1;

        bool resultHeads = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    msg.sender,
                    totalFlips
                )
            )
        ) % 2 == 0;

        bool won = choiceHeads == resultHeads;
        uint256 amountPaid = won ? payout : 0;

        if (won) {
            (bool sent, ) = payable(msg.sender).call{value: payout}("");
            require(sent, "Payout failed");
        }

        emit CoinFlipped(msg.sender, msg.value, choiceHeads, resultHeads, won, amountPaid);
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Not enough house balance");

        (bool sent, ) = payable(owner).call{value: amount}("");
        require(sent, "Withdrawal failed");

        emit OwnerWithdrawal(owner, amount);
    }

    function houseBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
