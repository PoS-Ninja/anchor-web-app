import { ancAncUstLpProvideTx } from '@anchor-protocol/app-fns';
import { ANC, Rate, u, UST } from '@anchor-protocol/types';
import { useFixedFee, useRefetchQueries } from '@libs/app-provider';
import { useStream } from '@rx-stream/react';
import { useConnectedWallet } from '@terra-money/wallet-provider';
import { useCallback } from 'react';
import { useAnchorWebapp } from '../../contexts/context';
import { ANCHOR_TX_KEY } from '../../env';
import { useAnchorBank } from '../../hooks/useAnchorBank';
import { useAncPriceQuery } from '../../queries/anc/price';

export interface AncAncUstLpProvideTxParams {
  ancAmount: ANC;
  ustAmount: UST;
  txFee: u<UST>;
  onTxSucceed?: () => void;
}

export function useAncAncUstLpProvideTx() {
  const connectedWallet = useConnectedWallet();

  const { queryClient, txErrorReporter, constants, contractAddress } =
    useAnchorWebapp();

  const { tax } = useAnchorBank();

  const fixedFee = useFixedFee();

  const refetchQueries = useRefetchQueries();

  const { data: { ancPrice } = {} } = useAncPriceQuery();

  const stream = useCallback(
    ({
      ancAmount,
      ustAmount,
      txFee,
      onTxSucceed,
    }: AncAncUstLpProvideTxParams) => {
      if (!connectedWallet || !connectedWallet.availablePost || !ancPrice) {
        throw new Error('Can not post!');
      }

      return ancAncUstLpProvideTx({
        // fabricateTerraswapProvideLiquidityANC
        ancTokenAddr: contractAddress.cw20.ANC,
        ancUstPairAddr: contractAddress.cw20.AncUstLP,
        walletAddr: connectedWallet.walletAddress,
        ancAmount,
        ustAmount,
        slippageTolerance: '0.01' as Rate,
        // receipts
        ancPrice,
        tax,
        // post
        network: connectedWallet.network,
        post: connectedWallet.post,
        txFee,
        fixedGas: fixedFee,
        gasFee: constants.gasWanted,
        gasAdjustment: constants.gasAdjustment,
        // query
        queryClient,
        // error
        txErrorReporter,
        // side effect
        onTxSucceed: () => {
          onTxSucceed?.();
          refetchQueries(ANCHOR_TX_KEY.ANC_ANC_UST_LP_PROVIDE);
        },
      });
    },
    [
      connectedWallet,
      ancPrice,
      contractAddress.cw20.ANC,
      contractAddress.cw20.AncUstLP,
      tax,
      fixedFee,
      constants.gasWanted,
      constants.gasAdjustment,
      queryClient,
      txErrorReporter,
      refetchQueries,
    ],
  );

  const streamReturn = useStream(stream);

  return connectedWallet ? streamReturn : [null, null];
}
