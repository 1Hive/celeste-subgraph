import { Address, BigInt } from '@graphprotocol/graph-ts'
import { Transfer as TransferEvent } from '../types/templates/ANJ/ANJ'
import { ANJ as ANJTokenContract } from '../types/templates/ANJ/ANJ'
import { ANJBalance as Balance, ANJTransfer as Transfer } from '../types/schema'

export function handleTransfer(event: TransferEvent): void {
  let id = event.transaction.hash.toHexString() + event.logIndex.toHexString()

  if (isTransferMissing(id)) {
    let transfer = new Transfer(id)

    transfer.from = event.params._from
    transfer.to = event.params._to
    transfer.amount = event.params._amount
    transfer.createdAt = event.block.timestamp
    transfer.save()

    let previousBlock = event.block.number.minus(BigInt.fromI32(1))

    let sender = loadOrCreateBalance(event.address, event.params._from, previousBlock)
    sender.amount = sender.amount.minus(event.params._amount)
    sender.save()

    let recipient = loadOrCreateBalance(event.address, event.params._to, previousBlock)
    recipient.amount = recipient.amount.plus(event.params._amount)
    recipient.save()
  }
}

function loadOrCreateBalance(tokenAddress: Address, owner: Address, previousBlock: BigInt): Balance | null {
  let id = owner.toHexString()
  let balance = Balance.load(id)

  if (balance === null) {
    balance = new Balance(id)
    balance.owner = owner
    
    let tokenContract = ANJTokenContract.bind(tokenAddress)
    balance.amount = _getBalanceOfAt(tokenContract, owner, previousBlock)
  }

  return balance
}

function isTransferMissing(id: string): boolean {
  let transfer = Transfer.load(id)
  return transfer === null
}

function _getBalanceOfAt(tokenContract: ANJTokenContract, holderAddress: Address, blockNumber: BigInt): BigInt {
  let callResult = tokenContract.try_balanceOfAt(holderAddress, blockNumber)
  if (callResult.reverted) {
    return BigInt.fromI32(0)
  } else {
    return callResult.value
  }
}