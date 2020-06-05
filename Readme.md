# User Defined Policies (UDP) in API Connect 2018.

This tutorial target UDP for API Gateway Native or *new* implementation.

The purpose of this asset is to help deploying an UDP on APIC 2018.
To illustrate this a mq-invoke policy is used as UDP.

The mq-invoke policy sends a message to MQ.

## UDP Principle
### Introduction

UDP is a user defined policy that is made available as a new policy in the manger UI and made available on the gateway.

The *new* API Gateway is made of native datapower objects. 
The configuration and the creation of these objects are made by the DataPower configuration sequence service using configuration file (by default it uses cfg extension) files available on the DataPower.

From KC:
> A configuration sequence is a script-based way to create, modify, and delete configurations on the DataPower® Gateway.

Configuration file consists of DataPower commands. Those configuration files can be found in config, local and temporary/config.

The *API Connect Gateway Service* object in DataPower is retrieving from API Connect configuration files.

All commands can be found at the following link:
[KC commands](https://www.ibm.com/support/knowledgecenter/SS9H2Y_7.7.0/com.ibm.dp.doc/readingsyntaxstatements.html)

API Gateway references API Objects that has the following hierarchical structure:
  
      |- API Object
          |- API Assembly
              |- API Rule
                  |- API Assembly Action
                  |- API Assembly function call
                      |- API Assembly function
                      |- API Assembly

A UDP is actually an *API Assembly function* that are created using gateway extension feature.
The UDP is created using configuration files that contain all the commands to create the assembly, actions, ... and any DataPower objects that would be required to be used from your API Assembly action.

When an UDP is deployed, it will be added as *user-defined policy* on API Connect Gateway Service.
The API Gateway Service will tell API Connect that there are new policies available and it will be made available in the API Manager UI.

UDP configurations are stored as part of gateway extensions at temporary:///config/filestores/extensions/gateway-extension
More information is provided in the packaging session.

The following provides an example of configuration commands used to create a UDP:
[KC UDP example](https://www.ibm.com/support/knowledgecenter/SSMNED_2018/com.ibm.apic.policy.doc/rapic_custpolicies_apigw_define.html)
 
The hierarchical structure of the UDP is as follow:
  
      |- API Assembly function
          |- API Assembly
              |- API Rule
                  |- API Assembly Action

The assembly actions are "Assembly xxx Actions" such set-variable, Redact, gatewayscript, ...
Each action has a set of commands that can be executed to configure the Action. For example the Assembly GatewayScript Action can be created using:

```yaml
assembly-gatewayscript "mq-invoke_1.0.0_gws_0"
 reset
 title "MQ Invoke"
 gatewayscript-location "temporary:///filestores/extensions/gateway-extension/mq-invoke/mq-invoke-code.js"
exit

```
- reset is a command to set the value to default
- title command creates the title
- gatewayscript-location command defines where the gws file is located

For example the gatewayscript action is available at the following link:
[KC gws action command](https://www.ibm.com/support/knowledgecenter/SS9H2Y_7.7.0/com.ibm.dp.doc/assemblygatewayscriptactioncommands.html)
 
Viewing running configuration can be found by: Troubleshooting -> Advanced -> View running config
### Capabilities

Any DataPower capabilities can be used from a UDP:
- XSLT 
- GatewayScript
- Processing rules called from an XSLT or Gatewayscript

It is good to know that all of these capabilities can be used directly in an assembly as well, the UDP just made a wrapper arround the actions that you have defined.

DataPower objects can be created along with your assembly UDP when the extension is created.
For example in this tutorial, we have created a mq-qm object to connect to a remote queue manager.
This queue manager object is then used in the gatewayscript using an url-open.

#### Processing rules
Those can be called from a gatewayscript using the following approach:
Multi step documentation available on KC:
[KC multistep](https://www.ibm.com/support/knowledgecenter/SS9H2Y_7.7.0/com.ibm.dp.doc/multistep_js.html)

```javascript
var ms = require ('multistep');

var inputMessage = context.createMessage('inputCtx');
inputMessage.body.write('{"myJSONPayload":"MyPayload"}');


// Input of multistep is the name of a message object. And the messageObj.body is the payload
// outputCtx will be a message object containing the response
try {
    ms.callRule ('myRuleName', 'inputCtx', 'outputCtx', 
      function(error) {
          var result = null;

          if (error) {
              //check if output context variable is defined
              if (outputCtx != '') {
                console.info("output context %s", JSON.stringify(outputCtx));
              }
                console.error(error);
                session.output.write(error);
          } else if (outputCtx != '') {
              console.info("writing result %s", result);
              session.output.write(context.get(outputCtx.body));
          }
      }
    );
} catch (error) {
    console.error(error);
    session.output.write(error);
}
```

```javascript
var ms = require('multistep');

var fooObj = context.createMessage('foo');
var barObj = context.createMessage('bar');

fooObj.body.write('HelloWorld');
fooObj.header.set('Header1', 'myHeader');
fooObj.setVariable('Var1', 'myVar');

ms.callRule('rule1', 'foo', 'bar', function(error) {
  barObj.body.readAsBuffer(function(error, buf) {
    var OutputPayload = buf.toString();
    var OutputHeaders = barObj.header.get();
    var OutputVar1 = barObj.getVariable('Var2');
  });
});

```
## Building UDP
The following part explains the contents of the UDP.

The asset contains
- configuration file to build the API assembly - `mq-invoke-policy.cfg`.
- configuration file to build the queue manager object - `mq-invoke-dpobj.cfg`
- the gatewayscript used by the gatewayscript action to call mq using url-open and made use of the dp queue manager object.

The hierarchy call structure of a UDP assembly is:
  
      |- API Assembly function : assembly-function "mq-invoke_1.0.0"
          |- API Assembly: assembly "mq-invoke_1.0.0"
              |- API Rule: api-rule "mq-invoke_1.0.0_main"
                  |- API Assembly Action: assembly-gatewayscript "mq-invoke_1.0.0_gws_0"

The configuration file used to create the UDP assembly contains all the commands to created the API objects.
The different API objects are described here after.

### Assembly action

The example has only one Assembly Action: a gatewayscript file.
```
assembly-gatewayscript "mq-invoke_1.0.0_gws_0"
 reset
 title "MQ Invoke"
 correlation-path "$.x-ibm-configuration.assembly.execute[0]"
 gatewayscript-location "temporary:///filestores/extensions/gateway-extension/mq-invoke/mq-invoke-code.js"
exit
```

The `correlation-path` command is only used for debugging purpose. And the `x-ibm-configuration` object has a specific structure that has different elements:
enforced, phase, testable, cors, activity-log, assembly.execute, gateway … 
 
The UDP pakaged zip file (see packaging UDP below), that contains the gatewayscript file, is unzipped on DataPower under the location `temporary:///filestores/extensions/gateway-extension`. The folder `mq-invoke` is a standard folder in the zip containing the gatewayscript file.

It is possible to have multiple actions and data can be passed along using standard variable using context object: `context.set('myvar')` or `context.get('myVar')`.

### Assembly rule
There is only one rule. The rule defines the Assembly actions.

```
api-rule "mq-invoke_1.0.0_main"
 reset
 action mq-invoke_1.0.0_gws_0
exit
```
You may have multiple actions defined as in this example:

```
api-rule udp-basic_1.0.0_main
  reset
  action udp-basic_1.0.0_set-variable_0
  action udp-basic_1.0.0_gatewayscript_1
exit
```
### Assembly
The assembly defines the rule to be called:

```
assembly udp-basic_1.0.0
  reset
  rule udp-basic_1.0.0_main
exit
```
### Assembly-function

The assembly function is the "API Manager UI interface" and it is used to 
- define the name of the policy that will be displayed in the manager UI assembly
- the parameters that will be displayed as user parameter of the policy assembly
- to define what assembly has to be called

```
assembly-function "mq-invoke_1.0.0"
 reset
 title "MQ put"
 parameter
   name "qmgrObj"
   label "QMgr Object"
   description "gateway qmgr object"
   value-type string
   value "mainmqm"
 exit
 parameter
   name "variableName"
   label "variableName"
   description "name of the variable that contains the payload"
   value-type string
   value "mqmsgdata"
 exit
 parameter
   name "varOutputName"
   label "varOutputName"
   description "name of the variable for the response"
   value-type string
   value "message.body"
 exit 
 parameter
   name "queue"
   label "Queue"
   description "The Queue to be used"
   value-type string
 exit
 parameter
   name "format"
   label "Format"
   description "Format"
   value-type string
   value "MQSTR"
 exit
 assembly mq-invoke_1.0.0
exit
```

Parameters defined by this assembly function call can be accessed in the different API assembly Action using the **local** object: `local.parameter.MyParam`.
For instance the gatewayscript can access the queue parameter value using: `context.get('local.parameter.queue')`.

#### OpenAPI file example
The yaml file *mq-policy_1.0.0.yaml* can be used as example on how to use the UDP policy in a API definition.
You can import the OpenAPI in APIC once the 
## Packaging the UDP

### structure
The UDP is deployed on the gateway as gateway extension. 
Gateway extensions are deployed to a gateway as one package that contains all the extensions. 
To add a new extension you need to 
1. Get the old extension package (from a source repo or by getting it from the manager)
2. Add the new extension to the existing package (it's a zip file)
3. Delete the old extension from the gateway (using the cli - see further): apic gateway-extensions:delete
4. Create again the gateway extension using the cli and the new package: apic gateway-extensions:create

It is therefore a good idea to place the UDP files into a folder and add this folder to the package. The folder will be created on the DataPower under `temporary:///filestores/extensions/gateway-extension/`.
In this example, the files have been placed under the folder "mq-invoke".

The folder *mq-invoke* contains the .cfg files (API assembly configuration and queue manager object configuration) and the gatewayscript.

### Command to publish the UDP assembly

Here are the steps that can be performed to package and publish the UDP:
- Create the zip:

`zip mq-invoke-ext.zip mq-invoke/*.cfg mq-invoke/*.js`
- Login to the manager using the scope **admin**:

`apic login --server mgmtHost --realm admin/myIdp -u myAdminUser`
*myIdp* is the identity provider where the user *myAdminUser* is defined.
To get the list of identity provider in the admin scope, you can use the following cli:

`apic identity-providers:list --scope admin -s mgmtHost`
- Deploy the package with the command

`apic gateway-extensions:create myPackage.zip --scope org --org admin --gateway-service myGatewayService --availability-zone availabilityZoneOfGatewaySrv -s mgmtHost`

The organisation has to be *admin*.
To get the list of availability zone, the following cli can be used:

`apic availability-zones:list --org admin -s $mgmt`

And the list of gateway service in a particular availability zone:

`apic gateway-services:list --org admin --availability-zones availabilityZoneOfGatewaySrv -s $mgmt`

To redeploy your UDP (if you make a change) follow the steps:
- delete the UDP: 
`apic gateway-extensions:delete --scope org --org admin --gateway-service myGatewayService --availability-zone availabilityZoneOfGatewaySrv -s mgmtHost`
- create the UDP

The deployment takes a while to get the extension downloaded from the gateway. The API GatewayService on the DataPower has a configuration to tells the interval time to get information.

Once the extension files has been downloaded by the Gateway on the DataPower, the objects are created by the configuration sequence service.

The extension is not add automatically to the Gateway Gateway Service.
This is because it requires a restart of the service to take the new configuration into account which implies a service disruption.
For the Manual step:
- Login in the DataPower UI
- Search for the *API Gateway Service*
- Add the user-defined policy
- Disable the gw service
- Enable the gw service

In a kubernetes deployment, the configruation of the user defined policy can be automated using a config map.

After this configuration, the gateway will notify the manager that a user-defined policy is available and it will then appears in the assembly. This can take one to a couple of minutes.

## Resources
 [Building User-Defined Policies on the API Gateway - API Connect](https://developer.ibm.com/apiconnect/2019/08/20/building-user-defined-policies-on-the-api-gateway/)
 
 [User Defined Policies / Custom Policies in API Connect 2018 (MQ invoke Example)](https://chrisphillips-cminion.github.io/apiconnect/2020/03/16/CustomPoliciesAPIConnect2018.html)
 [GitHub - ozairs/apiconnect-policies](https://github.com/ozairs/apiconnect-policies)
 