let dbModel = require('dvp-dbmodels');

let CheckCustomerCall = function(phoneNumber, companyId, tenantId, uuid, hanguptime, callback)
{
    let sqlCond = {where:[{CreatedTime : {$gt:hanguptime}, CompanyId: companyId, TenantId: tenantId, $or:[{SipFromUser: phoneNumber},{SipToUser: phoneNumber}], IsAnswered:true, BillSec:{$gt:0}, Uuid:{$ne:uuid}}]};
    dbModel.CallCDRProcessed.aggregate('*', 'count', sqlCond).then(function(count)
    {
        callback(null, count);

    }).catch(function(err)
    {
        callback(err, 0);
    });
};

module.exports.CheckCustomerCall = CheckCustomerCall;