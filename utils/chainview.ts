import {ContractFactory, Interface, InterfaceAbi, ContractMethodArgs, BytesLike, Fragment, ZeroAddress, BigNumberish} from "ethers";
import {ethers} from "hardhat";
export const chainView = async <A extends any[], R>(
    abi: InterfaceAbi,
    bytecode: BytesLike,
    params: ContractMethodArgs<A>,
    options: {from?: string; value?: bigint; blockTag?: BigNumberish} = {}
): Promise<R> => {
    const provider = ethers.provider;

    const ChainViewInterface = new Interface(abi);
    const errorNamesExpected = ChainViewInterface.fragments.filter((f): f is Fragment & {name: string} => f.type === "error").map((error) => error.name);
    const ChainView = new ContractFactory(abi, bytecode, provider);

    //get deploy data transaction
    const deploy = await ChainView.getDeployTransaction(...params);
    deploy.from = options.from || ZeroAddress;
    deploy.value = options.value || 0n;
    if (options.blockTag) {
        deploy.blockTag = options.blockTag;
    }

    //simulate the deployment of the contract
    let dataError: any;
    try {
        await provider.call(deploy);
    } catch (e: any) {
        dataError = e.data;
    }
    // console.log(dataError);

    //decode data returned by the fake deployment
    const decoded = ChainViewInterface.parseError(dataError);
    const errorName = decoded!.name;
    if (!errorNamesExpected.includes(errorName)) {
        throw new Error(`ChainView Error: ${decoded?.name} with arg ${decoded?.args} at selector ${decoded?.selector}`);
    } else {
        return decoded!.args as R;
    }
};
