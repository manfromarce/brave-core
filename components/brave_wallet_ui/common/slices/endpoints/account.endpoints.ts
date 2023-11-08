// Copyright (c) 2023 The Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

// constants
import { BraveWallet } from '../../../constants/types'
import { NETWORK_TAG_IDS } from './network.endpoints'

// types
import { WalletApiEndpointBuilderParams } from '../api-base.slice'
import { AccountInfoEntityState } from '../entities/account-info.entity'

// utils
import { handleEndpointError } from '../../../utils/api-utils'

export const ACCOUNT_TAG_IDS = {
  REGISTRY: 'REGISTRY',
  SELECTED: 'SELECTED'
} as const

export const accountEndpoints = ({
  mutation,
  query
}: WalletApiEndpointBuilderParams) => {
  return {
    getAccountInfosRegistry: query<AccountInfoEntityState, void>({
      queryFn: async (_arg, { endpoint }, _extraOptions, baseQuery) => {
        try {
          const { cache } = baseQuery(undefined)
          return {
            data: await cache.getAccountsRegistry()
          }
        } catch (error) {
          return handleEndpointError(
            endpoint,
            'Unable to fetch accounts',
            error
          )
        }
      },
      providesTags: (res, err) =>
        err
          ? ['UNKNOWN_ERROR']
          : [{ type: 'AccountInfos', id: ACCOUNT_TAG_IDS.REGISTRY }]
    }),
    invalidateAccountInfos: mutation<boolean, void>({
      queryFn: (arg, api, extraOptions, baseQuery) => {
        baseQuery(undefined).cache.clearAccountsRegistry()
        return { data: true }
      },
      invalidatesTags: [
        { type: 'Network', id: NETWORK_TAG_IDS.SELECTED },
        { type: 'AccountInfos', id: ACCOUNT_TAG_IDS.REGISTRY }
      ]
    }),
    invalidateSelectedAccount: mutation<boolean, void>({
      queryFn: (arg, api, extraOptions, baseQuery) => {
        baseQuery(undefined).cache.clearSelectedAccount()
        return { data: true }
      },
      invalidatesTags: [
        { type: 'Network', id: NETWORK_TAG_IDS.SELECTED },
        { type: 'AccountInfos', id: ACCOUNT_TAG_IDS.SELECTED }
      ]
    }),
    setSelectedAccount: mutation<BraveWallet.AccountId, BraveWallet.AccountId>({
      queryFn: async (accountId, { endpoint }, extraOptions, baseQuery) => {
        try {
          const {
            cache,
            data: { keyringService }
          } = baseQuery(undefined)

          await keyringService.setSelectedAccount(accountId)
          cache.clearSelectedAccount()

          return {
            data: accountId
          }
        } catch (error) {
          return handleEndpointError(
            endpoint,
            `Failed to select account (${accountId})`,
            error
          )
        }
      },
      invalidatesTags: [
        { type: 'Network', id: NETWORK_TAG_IDS.SELECTED },
        { type: 'AccountInfos', id: ACCOUNT_TAG_IDS.SELECTED }
      ]
    }),
    getSelectedAccountId: query<BraveWallet.AccountId | null, void>({
      queryFn: async (arg, { dispatch }, extraOptions, baseQuery) => {
        return {
          data:
            (await baseQuery(undefined).cache.getAllAccounts()).selectedAccount
              ?.accountId || null
        }
      },
      providesTags: [{ type: 'AccountInfos', id: ACCOUNT_TAG_IDS.SELECTED }]
    }),
    addAccount: mutation<
      BraveWallet.AccountInfo,
      {
        accountName: string
        keyringId: BraveWallet.KeyringId
        coin: BraveWallet.CoinType
      }
    >({
      queryFn: async (args, { endpoint }, extraOptions, baseQuery) => {
        try {
          const { accountInfo } = await baseQuery(
            undefined
          ).data.keyringService.addAccount(
            args.coin,
            args.keyringId,
            args.accountName
          )

          if (!accountInfo) {
            throw new Error('Account info not found')
          }

          return {
            data: accountInfo
          }
        } catch (error) {
          return handleEndpointError(
            endpoint,
            `Failed to create an account for ${JSON.stringify(
              args,
              undefined,
              2
            )}`,
            error
          )
        }
      },
      invalidatesTags: ['AccountInfos']
    })
  }
}
