# Gauges - Log Book

## Add gauge Type

Contract: **GaugeController**\
Address: [0xdB77895Ea7fBEc05264423910ef9C9144Ee8190D](https://etherscan.io/address/0xdB77895Ea7fBEc05264423910ef9C9144Ee8190D#code)\
Function: **add_type**

**Parameters**
- Name
- Weight

## Add Several Gauges

Contract: **GaugeController**\
Address: [0xdB77895Ea7fBEc05264423910ef9C9144Ee8190D](https://etherscan.io/address/0xdB77895Ea7fBEc05264423910ef9C9144Ee8190D#code)\
Function: **add_gauges**

**Parameters**
- Gauge Parameters (array, 30 maximum)

**Gauge Parameters**
- **addr**: address of the future gauge (staking contract)
- **gauge_type**: type of the gauge (integer)
- **weight**: weight of the gauge

**Gauge Parameters Example** (one gauge)
```js
[
    {
        addr: '0x2FF160bcADb485b5F048b9880e6f471Af632060c', // sdCRVGaugeStaking
        gauge_type: 0,
        weight: 0
    }
]
```