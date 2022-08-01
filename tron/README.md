# How to deploy tron and its testnets

1. Run
`yarn flattenTron`

2. This generates a flatten code in `./tron/Payroll.sol`

3. Remove all lincences and add this licence to the top of `./tron/Payroll.sol`
`// SPDX-License-Identifier: AGPL-3.0-or-later`

4. Go to the [tronscan](https://tronscan.org/)

5. Deploy using the **Blockchain** -> **Contract Deployment**

6. Verify using the **Blockchain** -> **Contract Verification**

7. Once the contract is deployed, you must call the **initiliaze** method

8. You must also call the **approveTokens** method for the tokens that the contract is going to use.
