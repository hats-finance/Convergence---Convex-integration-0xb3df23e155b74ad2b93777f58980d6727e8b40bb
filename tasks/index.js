const priceTask = require("./prices");
const bondsTask = require("./bonds/bonds");
const timeTravel = require("./time-travel");
const cvgCycleUpdate = require("./cycle-update");
const setContextClaim = require("./staking/set-context-claim");
const setGaugeWeight = require("./staking/set-gauge-weight");
const distributeYs = require("./bonds/distribute-ys");
const contextMaker = require("./context/context-maker");
module.exports = {
  priceTask,
  bondsTask,
  timeTravel,
  cvgCycleUpdate,
  setContextClaim,
  setGaugeWeight,
  distributeYs,
  contextMaker,
};
