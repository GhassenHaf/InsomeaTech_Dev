function calculateExpirationDate(orderDate, term) {
    const orderDateObj = new Date(orderDate);
    let expirationDate = new Date(orderDateObj);
    
    switch (term) {
        case '1Year':
            expirationDate.setFullYear(orderDateObj.getFullYear() + 1);
            break;
        case '1Month':
            expirationDate.setMonth(orderDateObj.getMonth() + 1);
            break;
        case '3Years':
            expirationDate.setFullYear(orderDateObj.getFullYear() + 3);
            break;
        case 'Perpetual':
            expirationDate.setFullYear(orderDateObj.getFullYear() + 100);
            break;
        default:
            // Default to 1Year if term is not specified or recognized
            expirationDate.setFullYear(orderDateObj.getFullYear() + 1);
            break;
    }
    
    return expirationDate;
}

module.exports = {
    calculateExpirationDate
};