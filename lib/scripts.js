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


/**
 * Setting up Participants, Initial Contracts
 * @param {org.fmcgv3.SettingUp} setx contains nothing at the moment
 * @transaction
 */

 async function settingUp(setx) {
     const factory = getFactory();
     const namespace = 'org.fmcgv3';

     const producerRegistry = await getParticipantRegistry(namespace + '.Producer');
     const procRegistry = await getParticipantRegistry(namespace + '.ProcessingUnit');
     const distriRegistry = await getParticipantRegistry(namespace + '.Distributor');
     const sellerRegistry = await getParticipantRegistry(namespace + '.Seller');

     const newProducer = factory.newResource(namespace, 'Producer', '1');
     const newProcUnit = factory.newResource(namespace, 'ProcessingUnit', '2');
     const newDistributor = factory.newResource(namespace, 'Distributor', '3');
     const newSeller = factory.newResource(namespace, 'Seller', '4');

     newProducer.name = "Vegetable Farm";
     let prodAddress = factory.newConcept(namespace, 'Address');
     prodAddress.state = "UP";
     prodAddress.zip = "123";
     newProducer.address = prodAddress;
     newProducer.accountBalance = 1000000;

     newProcUnit.name = "Food Processing Unit";
     let procAddress = factory.newConcept(namespace, 'Address');
     procAddress.state = "MP";
     procAddress.zip = "456";
     newProcUnit.address = procAddress;
     newProcUnit.accountBalance = 1000000;

     newDistributor.name = "Great Distributor";
     let distAddress = factory.newConcept(namespace, 'Address');
     distAddress.state = "MH";
     distAddress.zip = "876";
     newDistributor.address = distAddress;
     newDistributor.accountBalance = 1000000;

     newSeller.name = "New Seller";
     let sellerAddress = factory.newConcept(namespace, 'Address');
     sellerAddress.state = "KA";
     sellerAddress.zip = "098";
     newSeller.address = sellerAddress;
     newSeller.accountBalance = 1000000;

     await producerRegistry.add(newProducer);
     await procRegistry.add(newProcUnit);
     await distriRegistry.add(newDistributor);
     await sellerRegistry.add(newSeller);
 }

/**
 * Delete All Resources
 * @param {org.fmcgv3.DeleteAll} delx contains nothing at the moment
 * @transaction
 */

 async function deleteAll(delx) {
     const namespace = 'org.fmcgv3';

     const producerRegistry = await getParticipantRegistry(namespace + '.Producer');
     const procRegistry = await getParticipantRegistry(namespace + '.ProcessingUnit');
     const distriRegistry = await getParticipantRegistry(namespace + '.Distributor');
     const sellerRegistry = await getParticipantRegistry(namespace + '.Seller');

     const shipmentRegistry = await getAssetRegistry(namespace + '.Shipment');
     const contractRegistry = await getAssetRegistry(namespace + '.Contract');
          
     const producers = await producerRegistry.getAll();
     const processingUnits = await procRegistry.getAll();
     const distributors = await distriRegistry.getAll();
     const sellers = await sellerRegistry.getAll();
     
     const shipments = await shipmentRegistry.getAll();
     const contracts = await contractRegistry.getAll();
     
    try {
    await producerRegistry.removeAll(producers);
    } catch (e) {

    }

    try {
        await procRegistry.removeAll(processingUnits);
    } catch (e) {
        
    }

    try {
        await distriRegistry.removeAll(distributors);
    } catch (e) {
        
    }

    try {
        await sellerRegistry.removeAll(sellers);
    } catch (e) {
        
    }

    try {
        await shipmentRegistry.removeAll(shipments);
    } catch (e) {
        
    }

    try {
        await contractRegistry.removeAll(contracts);
    } catch (e) {
        
    }

 }
