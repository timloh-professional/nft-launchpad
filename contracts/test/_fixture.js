const hre = require('hardhat')

const { MINTER_ROLE, MINTER_ADMIN_ROLE } = require('./staking/_const')

const { blockStamp, expectSuccess, ONE_THOUSAND_OGN } = require('./helpers')

async function defaultFixture() {
  await deployments.fixture()

  const { deployerAddr, signerAddr, masterAddr } = await getNamedAccounts()

  const MockDAI = await ethers.getContract('MockDAI')
  const MockOUSD = await ethers.getContract('MockOUSD')
  const MockUSDC = await ethers.getContract('MockUSDC')
  const MockUSDT = await ethers.getContract('MockUSDT')

  //manual deploy for now
  await deployments.deploy('OriginERC721_v2', {
    from: masterAddr,
    args: ["Franck's Toys", 'FRANC', 'https://nft.franck.com/nft/']
  })

  //manual deploy for now
  await deployments.deploy('OriginERC721_v3', { from: masterAddr })
  await deployments.deploy('OriginERC721_v3Factory', { from: masterAddr })

  await deployments.deploy('OriginERC721_v5', { from: masterAddr })
  await deployments.deploy('OriginERC721_v5Factory', { from: masterAddr })

  const dummyPolygonChainManagerAddress =
    '0x62CdCbfA146DF4961A039EB50d26bf89938A08de'
  await deployments.deploy('OriginPolygonERC721_v3', {
    from: deployerAddr,
    args: [
      'Origin NFT',
      'ORIGIN',
      'https://nft.origin.eth/nft/',
      dummyPolygonChainManagerAddress,
      masterAddr
    ]
  })

  await deployments.deploy('OriginERC721a_v2', {
    from: deployerAddr,
    args: [
      'Origin NFT',
      'ORIGIN',
      'https://nft.origin.eth/nft/',
      10,
      masterAddr,
      [masterAddr],
      [1]
    ]
  })

  /*
   * Deprecated contracts - DO NOT USE
   * Keeping these around in case we want to test them for whatever reason.
  await deployments.deploy('OriginERC721_v1', {
    from: masterAddr,
    args: [
      'Ultraviolet Vinyl Collection by 3LAU',
      'UVCOLLECTION',
      'https://nft.3lau.com/nft/'
    ]
  })
  await deployments.deploy('OriginERC721_v4', { from: masterAddr })
  await deployments.deploy('OriginERC721_v4Factory', { from: masterAddr })
  await deployments.deploy('OriginPolygonERC721_v2', {
    from: deployerAddr,
    args: [
      'Polygon NFT',
      'POLYNFT',
      'https://nft.marck.com/nft/',
      dummyPolygonChainManagerAddress,
      masterAddr
    ]
  })
  await deployments.deploy('OriginERC721a_v1', {
    from: deployerAddr,
    args: [
      'Origin NFT',
      'ORIGIN',
      'https://nft.origin.eth/nft/',
      10,
      masterAddr,
      [masterAddr],
      [1]
    ]
  })*/

  /**
   * DO NOT USE
   * These contracts no longer used due to bugs or security reasons.
  const blau = await ethers.getContract('OriginERC721_v1')
  const nftv4 = await ethers.getContract('OriginERC721_v4')
  const nft721a = await ethers.getContract('OriginERC721a_v1')
  const factoryV4 = await ethers.getContract('OriginERC721_v4Factory')
  const polygonV2 = await ethers.getContract('OriginPolygonERC721_v2')
  */

  const nftv2 = await ethers.getContract('OriginERC721_v2')
  const nftv3 = await ethers.getContract('OriginERC721_v3')
  const nftv5 = await ethers.getContract('OriginERC721_v5')
  const nft721a_v2 = await ethers.getContract('OriginERC721a_v2')
  const factory = await ethers.getContract('OriginERC721_v3Factory')
  const factoryV5 = await ethers.getContract('OriginERC721_v5Factory')
  const polygonV3 = await ethers.getContract('OriginPolygonERC721_v3')

  const master = await ethers.provider.getSigner(masterAddr)
  const deployer = await ethers.provider.getSigner(deployerAddr)

  await nftv3
    .connect(master)
    .initialize(
      masterAddr,
      masterAddr,
      "Franck's Toys",
      'FRANC',
      'https://nft.franck.com/nft/'
    )

  const ingestRegistry = await ethers.getContract('IngestRegistry')
  const ingestMasterProxy = await ethers.getContract('IngestMasterProxy')
  const ingestMaster = await ethers.getContractAt(
    'IngestMaster',
    ingestMasterProxy.address
  )

  const pool = await ethers.provider.getSigner(8)

  return {
    // deprecated contracts
    //blau,
    //nftv4,
    //nft721a,
    //factoryV4,
    //polygonV2,
    MockDAI,
    MockOUSD,
    MockUSDC,
    MockUSDT,
    nftv2,
    nftv3,
    nftv5,
    nft721a_v2,
    factory,
    factoryV5,
    polygonV3,
    master,
    deployer,
    ingestRegistry,
    ingestMaster,
    pool
  }
}

async function stakingFixture() {
  const { deployerAddr, masterAddr } = await getNamedAccounts()

  const deployer = ethers.provider.getSigner(deployerAddr)
  const master = ethers.provider.getSigner(masterAddr)

  await deployments.deploy('MockOGN', { from: deployerAddr })
  const mockOGN = await ethers.getContract('MockOGN')

  const seriesProxy = await ethers.getContract('SeriesProxy')
  const series = await ethers.getContractAt('Series', seriesProxy.address)

  const stOGNProxy = await ethers.getContract('StOGNProxy')
  const stOGN = await ethers.getContractAt('StOGN', stOGNProxy.address)

  const feeVaultProxy = await ethers.getContract('FeeVaultProxy')
  const feeVault = await ethers.getContractAt('FeeVault', feeVaultProxy.address)

  const seasonOne = await ethers.getContract('SeasonOne')
  const seasonTwo = await ethers.getContract('SeasonTwo')

  async function createUser(signer) {
    return {
      signer,
      address: await signer.getAddress(),
      originalBalanceETH: await signer.getBalance(),
      originalBalanceOGN: ethers.BigNumber.from(0)
    }
  }

  async function allowOGN(account, spenderAddress, amount) {
    return await mockOGN.connect(account).approve(spenderAddress, amount)
  }

  async function fundOGN(toAddress, amount) {
    return await mockOGN.connect(deployer).mint(toAddress, amount)
  }

  async function userStake(user, amount = ONE_THOUSAND_OGN) {
    await fundOGN(user.address, amount)
    user.originalBalanceOGN = await mockOGN.balanceOf(user.address)
    await allowOGN(user.signer, series.address, amount)
    await expectSuccess(series.connect(user.signer).stake(amount))
    user.timestamp = await blockStamp()
    const endTime = await seasonOne.endTime()
    const lockPeriod = await seasonOne.lockPeriod()
    const season = endTime.sub(lockPeriod).gt(user.timestamp)
      ? seasonOne
      : seasonTwo
    user.points = await season.getPoints(user.address)
  }

  const users = {
    alice: await createUser(await ethers.provider.getSigner(6)),
    bob: await createUser(await ethers.provider.getSigner(7)),
    charlie: await createUser(await ethers.provider.getSigner(8)),
    diana: await createUser(await ethers.provider.getSigner(9)),
    elaine: await createUser(await ethers.provider.getSigner(10))
  }

  return {
    master,
    deployer,
    feeVault,
    feeVaultProxy,
    seasonOne,
    seasonTwo,
    mockOGN,
    series,
    stOGN,
    userStake,
    createUser,
    allowOGN,
    fundOGN,
    users,
    nobody: await ethers.provider.getSigner(11)
  }
}

module.exports = {
  defaultFixture,
  stakingFixture
}
