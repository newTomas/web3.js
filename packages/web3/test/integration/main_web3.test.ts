/*
This file is part of web3.js.

web3.js is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

web3.js is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
*/

/* eslint-disable jest/no-standalone-expect */
import Contract from 'web3-eth-contract';
import { ENS } from 'web3-eth-ens';
import Web3Eth from 'web3-eth';
import { JsonRpcOptionalRequest, Web3BaseProvider } from 'web3-common';
import HDWalletProvider from '@truffle/hdwallet-provider';
import { Web3 } from '../../src/index';
import { GreeterAbi } from '../shared_fixtures/Greeter';

import {
	getSystemTestProvider,
	describeIf,
	itIf,
	getSystemTestAccounts,
	accounts as accountsAddrAndPriv,
} from '../shared_fixtures/system_tests_utils';

const waitForOpenConnection = async (
	web3Inst: Web3,
	currentAttempt: number,
	status = 'connected',
) => {
	return new Promise<void>((resolve, reject) => {
		const maxNumberOfAttempts = 10;
		const intervalTime = 5000; // ms

		const interval = setInterval(() => {
			if (currentAttempt > maxNumberOfAttempts - 1) {
				clearInterval(interval);
				reject(new Error('Maximum number of attempts exceeded'));
			} else if ((web3Inst.provider as unknown as Web3BaseProvider).getStatus() === status) {
				clearInterval(interval);
				resolve();
			}
			// eslint-disable-next-line no-plusplus, no-param-reassign
			currentAttempt++;
		}, intervalTime);
	});
};

describe('Web3 instance', () => {
	let clientUrl: string;
	let accounts: string[];
	let web3: Web3;
	let currentAttempt = 0;

	beforeAll(async () => {
		clientUrl = getSystemTestProvider();
		accounts = await getSystemTestAccounts();
	});
	beforeEach(async () => {
		currentAttempt = 0;
	});
	afterEach(async () => {
		if (getSystemTestProvider().startsWith('ws')) {
			// make sure we try to close the connection after it is established
			if ((web3.provider as unknown as Web3BaseProvider).getStatus() === 'connecting') {
				await waitForOpenConnection(web3, currentAttempt);
			}
			(web3.provider as unknown as Web3BaseProvider).disconnect();
		}
	});

	describeIf(getSystemTestProvider().startsWith('http'))(
		'Create Web3 class instance with http string providers',
		() => {
			it('should create instance with string provider', async () => {
				web3 = new Web3(clientUrl);
				expect(web3).toBeInstanceOf(Web3);
			});

			itIf(
				process.env.INFURA_GOERLI_HTTP
					? process.env.INFURA_GOERLI_HTTP.toString().includes('http')
					: false,
			)('should create instance with string of external http provider', async () => {
				web3 = new Web3(process.env.INFURA_GOERLI_HTTP!);
				expect(web3).toBeInstanceOf(Web3);
			});

			// todo fix ipc test
			// https://ethereum.stackexchange.com/questions/52574/how-to-connect-to-ethereum-node-geth-via-ipc-from-outside-of-docker-container
			// https://github.com/ethereum/go-ethereum/issues/17907
			// itIf(clientUrl.includes('ipc'))(
			// 	'should create instance with string of IPC provider',
			// 	() => {
			// 		// eslint-disable-next-line @typescript-eslint/no-unused-vars
			// 		// eslint-disable-next-line no-new
			// 		const fullIpcPath = path.join(__dirname, ipcStringProvider);
			// 		const ipcProvider = new Web3.providers.IpcProvider(fullIpcPath);
			// 		web3 = new Web3(ipcProvider);
			// 		expect(web3).toBeInstanceOf(Web3);
			// 	},
			// );
		},
	);

	describeIf(getSystemTestProvider().startsWith('ws'))(
		'Create Web3 class instance with ws string providers',
		() => {
			it('should create instance with string of ws provider', async () => {
				web3 = new Web3(clientUrl);
				expect(web3).toBeInstanceOf(Web3);
			});

			itIf(
				process.env.INFURA_GOERLI_WS
					? process.env.INFURA_GOERLI_WS.toString().includes('ws')
					: false,
			)('should create instance with string of external http provider', async () => {
				web3 = new Web3(process.env.INFURA_GOERLI_WS!);
				expect(web3).toBeInstanceOf(Web3);
			});
		},
	);
	describe('Web3 providers', () => {
		it('should set the provider', async () => {
			web3 = new Web3('http://dummy.com');

			web3.provider = clientUrl;

			expect(web3).toBeInstanceOf(Web3);

			const response = await web3.eth.getBalance(accounts[0]);

			expect(response).toMatch(/0[xX][0-9a-fA-F]+/);
		});
	});

	describe('Module instantiations', () => {
		it('should create module instances', () => {
			web3 = new Web3(clientUrl);

			expect(web3.eth).toBeInstanceOf(Web3Eth);
			expect(web3.eth.ens).toBeInstanceOf(ENS);
			expect(web3.eth.abi).toEqual(
				expect.objectContaining({
					encodeEventSignature: expect.any(Function),
					encodeFunctionCall: expect.any(Function),
					encodeFunctionSignature: expect.any(Function),
					encodeParameter: expect.any(Function),
					encodeParameters: expect.any(Function),
					decodeParameter: expect.any(Function),
					decodeParameters: expect.any(Function),
					decodeLog: expect.any(Function),
				}),
			);
			expect(web3.eth.accounts).toEqual(
				expect.objectContaining({
					create: expect.any(Function),
					privateKeyToAccount: expect.any(Function),
					signTransaction: expect.any(Function),
					recoverTransaction: expect.any(Function),
					hashMessage: expect.any(Function),
					sign: expect.any(Function),
					recover: expect.any(Function),
					encrypt: expect.any(Function),
					decrypt: expect.any(Function),
				}),
			);
			const greeterContract = new web3.eth.Contract(GreeterAbi);
			expect(greeterContract).toBeInstanceOf(Contract);
		});
	});

	describeIf(getSystemTestProvider().startsWith('http'))(
		'Create Web3 class instance with external providers',
		() => {
			let provider: HDWalletProvider;
			beforeAll(() => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				provider = new HDWalletProvider({
					privateKeys: [accountsAddrAndPriv[0].privateKey],
					providerOrUrl: clientUrl,
				});
			});
			afterAll(() => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				provider.engine.stop();
			});
			it('should create instance with external wallet provider', async () => {
				web3 = new Web3(provider);
				expect(web3).toBeInstanceOf(Web3);
			});
		},
	);

	describe('Batch Request', () => {
		let request1: JsonRpcOptionalRequest;
		let request2: JsonRpcOptionalRequest;
		beforeEach(() => {
			request1 = {
				id: 10,
				method: 'eth_getBalance',
				params: [accounts[0], 'latest'],
			};
			request2 = {
				id: 11,
				method: 'eth_getBalance',
				params: [accounts[1], 'latest'],
			};
		});

		it('should execute batch requests', async () => {
			web3 = new Web3(clientUrl);

			const batch = new web3.BatchRequest();

			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			batch.add(request1);
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			batch.add(request2);
			const response = await batch.execute();
			// console.warn('***', response);

			expect(response).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: request1.id,
						result: expect.stringMatching(/0[xX][0-9a-fA-F]+/),
					}),
					expect.objectContaining({
						id: request2.id,
						result: expect.stringMatching(/0[xX][0-9a-fA-F]+/),
					}),
				]),
			);
		});
	});
});