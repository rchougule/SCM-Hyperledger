/**
 * New script file
 */

/**
 * Temperature Reading Transaction of a shipment in transit
 * @param {org.fmcgv3.TemperatureReading} temperatureReading it contains the temperature readings
 * @transaction
 */
async function temperatureTransaction(temperatureReading) {
	
    const shipment = temperatureReading.shipment;
    
    if(shipment.temperatureReadings) {
      shipment.temperatureReadings.push(temperatureReading);
  } else {
      shipment.temperatureReadings = [temperatureReading];
  }

    shipment.status = "IN_TRANSIT";
    const shipmentRegistry = await getAssetRegistry('org.fmcgv3.Shipment');
    await shipmentRegistry.update(shipment);
}

/**
 * Shipment Received Transaction
 * @param {org.fmcgv3.ShipmentReceived} shipmentReceived it contains the shipment which was finally arrived at the destination
 * @transaction
 */
async function shipmentReceived(shipmentReceived) {

    const contract = shipmentReceived.shipment.contract;
    const shipment = shipmentReceived.shipment;
    let payOut = contract.unitPrice * shipment.unitCount;

    shipment.status = 'ARRIVED';

    if (shipmentReceived.timestamp > contract.arrivalDateTime) {
        payOut = 0;
        console.log('Late shipment');
    } else {
        if (shipment.temperatureReadings) {
            shipment.temperatureReadings.sort(function (a, b) {
                return (a.centigrade - b.centigrade);
            });
            const lowestReading = shipment.temperatureReadings[0];
            const highestReading = shipment.temperatureReadings[shipment.temperatureReadings.length - 1];
            let penalty = 0;

            if (lowestReading.centigrade < contract.minTemperatureAllowed) {
                penalty += (contract.minTemperatureAllowed - lowestReading.centigrade) * contract.minPenaltyFactor;
            }

            if (highestReading.centigrade > contract.maxTemperatureAllowed) {
                penalty += (highestReading.centigrade - contract.maxTemperatureAllowed) * contract.maxPenaltyFactor;
            }

            payOut -= (penalty * shipment.unitCount);

            if (payOut < 0) {
                payOut = 0;
            }
        }
    }


    if(contract.producer && contract.procUnit) {

        contract.producer.accountBalance += payOut;
        contract.procUnit.accountBalance -= payOut;

        const producerRegistry = await getParticipantRegistry('org.fmcgv3.Producer');
        const procUnitRegistry = await getParticipantRegistry('org.fmcgv3.ProcessingUnit');
        await producerRegistry.update(contract.producer);
        await procUnitRegistry.update(contract.procUnit);

    } else if(contract.procUnit && contract.distributor) {

        contract.procUnit.accountBalance += payOut;
        contract.distributor.accountBalance -= payOut;

        const distributorRegistry = await getParticipantRegistry('org.fmcgv3.Distributor');
        const procUnitRegistry = await getParticipantRegistry('org.fmcgv3.ProcessingUnit');
        await distributorRegistry.update(contract.distributor);
        await procUnitRegistry.update(contract.procUnit);

    } else if(contract.distributor && contract.seller) {

        contract.distributor.accountBalance += payOut;
        contract.seller.accountBalance -= payOut;

        const distributorRegistry = await getParticipantRegistry('org.fmcgv3.Distributor');
        const sellerRegistry = await getParticipantRegistry('org.fmcgv3.Seller');
        await distributorRegistry.update(contract.distributor);
        await sellerRegistry.update(contract.seller);
    }


    const shipmentRegistry = await getAssetRegistry('org.fmcgv3.Shipment');
    await shipmentRegistry.update(shipment);
}

/**
 * Shipment Creation Transaction for ProcUnit-Distributor
 * @param {org.fmcgv3.ProcUnit_Distributor_Shipment} shipTx it contains the data to create shipment asset
 * @transaction
 */
async function createShipmentAsset_ProcUnit_Distributor(shipTx) {
  const factory = getFactory();
    const nameSpace = 'org.fmcgv3';  

    // create a new shipment  
  const shipmentRegistry = await getAssetRegistry('org.fmcgv3.Shipment');
    const shipments = await shipmentRegistry.getAll();
    const newShipment = factory.newResource(nameSpace, 'Shipment', (shipments.length+1)+'');
    
    newShipment.status = "CREATED";
    newShipment.unitCount = shipTx.unitCount;
    newShipment.prevShipmentId = factory.newRelationship(nameSpace, 'Shipment', shipTx.prevShipmentId);
    newShipment.ProcUnitType = shipTx.ProcUnitType;
    newShipment.contract = factory.newRelationship(nameSpace, 'Contract', shipTx.contractId);

    // const shipmentRegistry = await getAssetRegistry(nameSpace+'.Shipment');
    await shipmentRegistry.add(newShipment);  	
}

/**
 * Shipment Creation Transaction for Producer-ProcUnit
 * @param {org.fmcgv3.Producer_ProcUnit_Shipment} shipTx it contains the data to create shipment asset
 * @transaction
 */
async function createShipmentAsset_Producer_ProcUnit(shipTx) {
  const factory = getFactory();
    const nameSpace = 'org.fmcgv3';  

    // create a new shipment  
    const shipmentRegistry = await getAssetRegistry('org.fmcgv3.Shipment');
    const shipments = await shipmentRegistry.getAll();
    const newShipment = factory.newResource(nameSpace, 'Shipment', (shipments.length+1)+'');
    
    newShipment.status = "CREATED";
    newShipment.unitCount = shipTx.unitCount;
    newShipment.ProducerType = shipTx.ProducerType;
    newShipment.contract = factory.newRelationship(nameSpace, 'Contract', shipTx.contractId);

    // const shipmentRegistry = await getAssetRegistry(nameSpace+'.Shipment');
    await shipmentRegistry.add(newShipment);  	
}

/**
 * Shipment Creation Transaction for Distributor_Seller
 * @param {org.fmcgv3.Distributor_Seller_Shipment} shipTx it contains the data to create shipment asset
 * @transaction
 */
async function createShipmentAsset_Distributor_Seller(shipTx) {
    const factory = getFactory();
    const nameSpace = 'org.fmcgv3';  

    // create a new shipment  
    const shipmentRegistry = await getAssetRegistry('org.fmcgv3.Shipment');
    const shipments = await shipmentRegistry.getAll();
    const newShipment = factory.newResource(nameSpace, 'Shipment', (shipments.length+1)+'');
    
    newShipment.status = "CREATED";
    newShipment.unitCount = shipTx.unitCount;
    newShipment.prevShipmentId = factory.newRelationship(nameSpace, 'Shipment', shipTx.prevShipmentId);
    newShipment.ProcUnitType = shipTx.ProcUnitType;
    newShipment.contract = factory.newRelationship(nameSpace, 'Contract', shipTx.contractId);

    // const shipmentRegistry = await getAssetRegistry(nameSpace+'.Shipment');
    await shipmentRegistry.add(newShipment);  	
}

/**
 * Contract Renewal between two parties
 * @param {org.fmcgv3.ContractRenewal} newContract contains the new contract data
 * @transaction
 */
async function contractRenewal(newContract) {
    const contractRegistry = await getAssetRegistry('org.fmcgv3.Contract');
    const existingContract = await contractRegistry.get(newContract.contractId);

    existingContract.arrivalDateTime = newContract.arrivalDateTime;
    existingContract.unitPrice = newContract.unitPrice;
    existingContract.minTemperatureAllowed = newContract.minTemperatureAllowed;
    existingContract.maxTemperatureAllowed = newContract.maxTemperatureAllowed;
    existingContract.minPenaltyFactor = newContract.minPenaltyFactor;
    existingContract.maxPenaltyFactor = newContract.maxPenaltyFactor;

    await contractRegistry.update(existingContract);
}
