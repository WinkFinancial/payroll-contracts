// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma abicoder v2;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "./interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "./libraries/PoolAddress.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./libraries/TickMath.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

contract Pool is IERC721Receiver {
    struct Deposit {
        address owner;
        uint256 liquidity;
        address tokenA;
        address tokenB;
        uint256 amountA;
        uint256 amountB;
    }

    event PoolCreated(address tokenA, address tokenB, uint24 fee, uint160 price);

    event NFTMinted(address pool, uint256 tokenId, uint256 liquidity);

    event LiquidityAdded(uint256 amountA, uint256 amountB, uint256 liquidity);

    event LiquidityDecreased(uint256 amountA, uint256 amountB, uint256 liquidity);

    IUniswapV3Factory public uniswapFactory;
    INonfungiblePositionManager public nonfungiblePositionManager;
    mapping(uint256 => Deposit) public deposits;
    mapping(address => uint256[]) public poolToDeposits;

    constructor(address _uniswapFactory, address _nonfungiblePositionManager) {
        uniswapFactory = IUniswapV3Factory(_uniswapFactory);
        nonfungiblePositionManager = INonfungiblePositionManager(_nonfungiblePositionManager);
    }

    /// @dev Creates a pool for the given two tokens and fee
    /// @param _tokenA The contract address of the first token
    /// @param _tokenB The contract address of the second token
    /// @param _fee The desired fee for the pool
    /// @param _price The initial sqrt price of the pool as a Q64.96
    function createPool(
        address _tokenA,
        address _tokenB,
        uint24 _fee,
        uint160 _price
    ) external returns (address pool) {
        pool = uniswapFactory.createPool(_tokenA, _tokenB, _fee);
        IUniswapV3Pool(pool).initialize(_price);
        emit PoolCreated(_tokenA, _tokenB, _fee, _price);
    }

    /// @dev Returnes the pool address
    /// @param _tokenA The contract address of the first token
    /// @param _tokenB The contract address of the second token
    /// @param _fee The fee tier of the pool
    function getPoolAddress(
        address _tokenA,
        address _tokenB,
        uint24 _fee
    ) public view returns (address pool) {
        pool = PoolAddress.computeAddress(address(uniswapFactory), PoolAddress.getPoolKey(_tokenA, _tokenB, _fee));
    }

    /// @dev Creates a new position wrapped in a NFT
    /// @param _tokenA The contract address of the inbound token
    /// @param _tokenB The contract address of the outbound token
    /// @param _fee The fee tier of the pool
    /// @param _tickLower The lower end of the tick range for the position
    /// @param _tickUpper The higher end of the tick range for the position
    /// @param amountA The amount of tokenA
    /// @param amountB The amount of tokenB
    function mintNewPosition(
        address _tokenA,
        address _tokenB,
        uint24 _fee,
        int24 _tickLower,
        int24 _tickUpper,
        uint256 amountA,
        uint256 amountB
    ) external {
        TransferHelper.safeTransferFrom(_tokenA, msg.sender, address(this), amountA);
        TransferHelper.safeTransferFrom(_tokenB, msg.sender, address(this), amountB);

        TransferHelper.safeApprove(_tokenA, address(nonfungiblePositionManager), amountA);
        TransferHelper.safeApprove(_tokenB, address(nonfungiblePositionManager), amountB);

        // slippage 1%
        uint256 amountAMin = amountA * (1e3) - (amountA * (1e3)) / (1e2);
        uint256 amountBMin = amountB * (1e3) - (amountB * (1e3)) / (1e2);

        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: _tokenA,
            token1: _tokenB,
            fee: _fee,
            tickLower: _tickLower,
            tickUpper: _tickUpper,
            amount0Desired: amountA,
            amount1Desired: amountB,
            amount0Min: amountAMin / (1e3),
            amount1Min: amountBMin / (1e3),
            recipient: address(this),
            deadline: block.timestamp + 120
        });

        (uint256 tokenId, uint256 liquidity, uint256 amount0, uint256 amount1) = nonfungiblePositionManager.mint(
            params
        );
        deposits[tokenId] = Deposit(msg.sender, liquidity, _tokenA, _tokenB, amount0, amount1);

        address pool = getPoolAddress(_tokenA, _tokenB, _fee);
        poolToDeposits[pool].push(tokenId);

        if (amount0 < amountA) {
            TransferHelper.safeApprove(_tokenA, address(nonfungiblePositionManager), 0);
            TransferHelper.safeTransfer(_tokenA, msg.sender, amountA - amount0);
        }

        if (amount1 < amountB) {
            TransferHelper.safeApprove(_tokenB, address(nonfungiblePositionManager), 0);
            TransferHelper.safeTransfer(_tokenB, msg.sender, amountB - amount1);
        }

        emit NFTMinted(pool, tokenId, liquidity);
    }

    /// @dev Increases the amount of liquidity in a position
    /// @param _tokenId The ID of the token for which liquidity is being increased
    /// @param _amountA The amount of tokenA
    /// @param _amountB The amount of tokenB
    function increaseLiquidity(
        uint256 _tokenId,
        uint256 _amountA,
        uint256 _amountB
    ) external {
        TransferHelper.safeTransferFrom(deposits[_tokenId].tokenA, msg.sender, address(this), _amountA);
        TransferHelper.safeTransferFrom(deposits[_tokenId].tokenB, msg.sender, address(this), _amountB);

        TransferHelper.safeApprove(deposits[_tokenId].tokenA, address(nonfungiblePositionManager), _amountA);
        TransferHelper.safeApprove(deposits[_tokenId].tokenB, address(nonfungiblePositionManager), _amountB);
        // slippage 1%
        uint256 amountAMin = _amountA * (1e3) - (_amountA * (1e3)) / (1e2);
        uint256 amountBMin = _amountB * (1e3) - (_amountB * (1e3)) / (1e2);

        INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager
            .IncreaseLiquidityParams({
                tokenId: _tokenId,
                amount0Desired: _amountA,
                amount1Desired: _amountB,
                amount0Min: amountAMin / (1e3),
                amount1Min: amountBMin / (1e3),
                deadline: block.timestamp + 120
            });

        (uint256 liquidity, uint256 amountA, uint256 amountB) = nonfungiblePositionManager.increaseLiquidity(params);
        deposits[_tokenId].liquidity += liquidity;
        deposits[_tokenId].amountA += amountA;
        deposits[_tokenId].amountB += amountB;
        emit LiquidityAdded(amountA, amountB, liquidity);
    }

    /// @dev Decreases the amount of liquidity in a position
    /// @param _tokenId The ID of the token for which liquidity is being decreased
    /// @param _liquidity The amount by which liquidity for the NFT position was decreased
    /// @param _amountAmin The minimum amount of tokenA that should be accounted for the burned liquidity
    /// @param _amountBmin The minimum amount of tokenB that should be accounted for the burned liquidity
    function decreaseLiquidity(
        uint256 _tokenId,
        uint128 _liquidity,
        uint256 _amountAmin,
        uint256 _amountBmin
    ) external {
        require(msg.sender == deposits[_tokenId].owner, "Not the owner");
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager
            .DecreaseLiquidityParams({
                tokenId: _tokenId,
                liquidity: _liquidity,
                amount0Min: _amountAmin,
                amount1Min: _amountBmin,
                deadline: block.timestamp + 120
            });

        (uint256 amountA, uint256 amountB) = nonfungiblePositionManager.decreaseLiquidity(params);

        deposits[_tokenId].liquidity -= _liquidity;
        deposits[_tokenId].amountA -= amountA;
        deposits[_tokenId].amountB -= amountB;

        emit LiquidityDecreased(amountA, amountB, _liquidity);
    }

    /// @dev Collects a maximum amount of fees owed to a specific position
    /// @param _tokenId The ID of the NFT for which tokens are being collected
    function receiveFees(uint256 _tokenId) external {
        INonfungiblePositionManager.CollectParams memory params = INonfungiblePositionManager.CollectParams({
            tokenId: _tokenId,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });

        (uint256 amountA, uint256 amountB) = nonfungiblePositionManager.collect(params);

        TransferHelper.safeTransfer(deposits[_tokenId].tokenA, deposits[_tokenId].owner, amountA);

        TransferHelper.safeTransfer(deposits[_tokenId].tokenB, deposits[_tokenId].owner, amountB);
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
