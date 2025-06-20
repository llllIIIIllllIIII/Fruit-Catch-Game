// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract GameScore {
    AggregatorV3Interface internal btcUsdPriceFeed;
    AggregatorV3Interface internal ethUsdPriceFeed;
    AggregatorV3Interface internal bnbUsdPriceFeed;

    constructor() {
        // BNB Testnet Chainlink Price Feed addresses
        btcUsdPriceFeed = AggregatorV3Interface(0x5741306c21795FdCBb9b265Ea0255F499DFe515C);
        ethUsdPriceFeed = AggregatorV3Interface(0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7);
        bnbUsdPriceFeed = AggregatorV3Interface(0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526);
    }

    function getBTCPrice() public view returns (int256) {
        (, int256 price,,,) = btcUsdPriceFeed.latestRoundData();
        return price;
    }

    function getETHPrice() public view returns (int256) {
        (, int256 price,,,) = ethUsdPriceFeed.latestRoundData();
        return price;
    }

    function getBNBPrice() public view returns (int256) {
        (, int256 price,,,) = bnbUsdPriceFeed.latestRoundData();
        return price;
    }
}
