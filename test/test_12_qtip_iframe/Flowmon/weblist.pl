#!/usr/bin/perl

=head1 NAME

Web listings

=head1 VERSION

1.0

=head1 SYNOPSIS

perl weblist.pl startTime endTime filter file

IPv4 MU:
perl weblist.pl "2015-06-04 08:05" "2015-06-04 08:10" "(dst port 443 or dst port 80) and dst net 147.251.0.0/16"

IPv6 MU:
perl weblist.pl "2015-06-04 08:05" "2015-06-04 08:10" "(dst port 443 or dst port 80) and dst net 2001:718:801::/48"

file is optional argument to specify output location, if not defined output will go on STDOUT

=head1 DESCRIPTION

This scripts connects to fmc REST API on collector2.ics.muni.cz and obtain list of IPs with hostnames as seen in flow data in specified time window. This list is limited to 10 000 records
For IPv4 addresses it then compare if the pair dstip-hostname corresponds to DNS lookup of that hostname. If not, such record is discarded.
For IPv6 DNS check is disabled and result can contain incorrect records (hostname is not hosted on dstip, can happen in flow data as result of "proxy scanning")
Queries on collector are processed asynchronously and script has to wait for results. If time window is too big, it can take tens of minutes to process. 
Final results are stored in file specified in 4th argument or standard output

=cut

use strict;
use warnings;

use JSON;
use REST::Client;
use Net::DNS;
use Data::Dumper;
use List::MoreUtils qw(uniq);
use lib "/home/csirt/devel/svn/netsec/trunk/fmc_REST/";
use Credentials;
use Try::Tiny;

# Verification of server certificate is currently disabled
$ENV{PERL_LWP_SSL_VERIFY_HOSTNAME}=0;

if( ($#ARGV +1) < 3 ){
  #print "Wrong number of arguments!\n";
  exit;
}
my $from = $ARGV[0];
my $to = $ARGV[1];
my $filter = $ARGV[2];
my $output = $ARGV[3];

#my $from = "2015-08-05 04:00";
#my $to = "2015-08-06 04:00";
#my $filter = "proto TCP and dst port 80 and dst net 147.251.0.0/16";
my $waitTime = 120;

my $user = $Credentials::rest->{collector2}->{user};
my $password = $Credentials::rest->{collector2}->{pass};

my $url = 'https://collector2.ics.muni.cz';

my $jsonFlows = JSON->new;
my %query = (
    "from"         => $from,    #"2015-08-04 08:05",
    "to"           => $to,      #"2015-08-04 08:10",
    "filter"       => $filter,  #"(dst port 443 or dst port 80) and dst net 147.251.0.0/16",
    "showOnly"     => 10000,
);

my $resolver = new Net::DNS::Resolver();

my $fh;
if($output){
  open($fh, '>', $output) or die("Cannot open file.");
} else {
  $fh = \*STDOUT;
}

my @items;                                                                                                                                     

my ($rc, $msg) = run(\%query, \$jsonFlows);
if(!$rc){
  #print $msg;
  exit;
}


# for each record with IPv4 address do DNS lookup and compare result with IP in record
for my $item( @{$jsonFlows} ){
    if( !exists($item->{dstip}) || !exists($item->{hhost}) ){
      next; # skip missing data
    }
    if( $item->{dstip} eq $item->{hhost} ){
      next; # skip data without hostname
    }
    if($item->{dstip} =~ m/(\d{1,3}\.){3}\d{1,3}/){
      if($item->{hhost} eq "" || $item->{hhost} =~ m/^\./ || $item->{hhost} =~ m/\.$/){
        next; # skipping garbage hostnames for which we are unable to do DNS check
      }
      my $query;
      # but you cannot filter everything
      # nice example of bad hhost from collector causing exceptions: if"%2C"../../cache/bogel.php"]}
      try{
        $query = $resolver->query($item->{hhost});
      } catch {
        #TODO: log error print "error: $_\n";
      };
      my $foundIP = "";
      if($query){
        foreach my $rr ($query->answer) {
          next unless $rr->type eq "A";
          $foundIP = $rr->address;
        }
      }
      if($foundIP eq $item->{dstip}){
        # only valid combinations of IP+hostname are stored in result data
        push(@items, "$item->{dstip};$item->{hhost};");
      }
    }else{
      # not IPv4 addresses
      push(@items, "$item->{dstip};$item->{hhost};");
    }  
  }

# remove duplicities and save result to file
my @uniq = uniq @items;
my @sorted = sort @uniq;
for my $item( @sorted ){
  print $fh $item, "\n";
}
close($fh);

=item run

  Main function of script. Connects to collector to get authentication token. With this
  token it posts a query and gets result. Query processing is asynchronous, so it waits 
  some time for results and dies if no result is available in this time period.

  Input:
    Hash of parameters:
      from    => start time window
      to      => last time window
      filter  => nfdump filter for query
      
  Output:
    flows = json object with result data 
=cut
sub run{
  my $query = shift;
  my $flows = shift;

  my $accessToken;
  my $resultID; 
  my ($rc, $msg); 

  # obtain access token for queries
  ($rc, $msg) = getToken(\$accessToken);
  if(!$rc){
    return(0, $msg);
  }
  
  # form query arguments with required parameters
  my %query = (
    "from"         => "$$query{'from'}",
    "to"           => "$$query{'to'}",
    "channels"     => '["mu", "ukb", "vss", "law", "cps", "sci", "ped", "phil", "ics-fi", "fss", "econ", "rect", "honeypot", "mimon1", "mimon2"]',
    "aggregateBy"  => '[ "dstip", "hhost" ]',
    "sortBy"       => "tstart",
    "filter"       => "$$query{'filter'}",
    "showonly"     => $$query{'showOnly'},
    "output"       => '["da", "hhost"]'
  );
  
  # process query and get id of result
  ($rc, $msg) = query($accessToken, \%query, \$resultID);
  if(!$rc){
    return(0, $msg);
  }

  # get result of query with provided id
  ($rc, $msg) = getResult($accessToken, $resultID, $flows);
  if(!$rc){
    return(0, $msg);
  }

  return 1;
}

=item getToken

  Connects to collector and obtains access token for further use

  Input:
      
  Output:
    accessToken = string with access token
=cut
sub getToken
{
  my $accessToken = shift;
  
  my $client = REST::Client->new({
      host    => 'https://collector2.ics.muni.cz',
      ca      => '/root/Phigaro/ca.pem',
      timeout => 10,
  });

  # form request for Invea REST API
  my $bodycontent = "grant_type=password";
     $bodycontent .= "\&client_id=invea-tech";
     $bodycontent .= "\&username=$user";
     $bodycontent .= "\&password=$password";

  $client->request('POST', '/resources/oauth/token', $bodycontent, {'Content-type' => 'application/x-www-form-urlencoded'});  

  # request didn't return access token
  if($client->responseCode() != 200){
    return (0, "Error occured: ".$client->responseContent());
  }

  # give obtained token to output
  $$accessToken = JSON::from_json($client->responseContent())->{'access_token'};

  return 1;
}

=item query

  Sends query to collector and gets id of result

  Input:
    token = string with access token
    queryParams = hash of parameters
      from        => first time window to search
      to          => last time window to search
      channels    => collector channels for live profile
      aggregateBy => list of aggregations
      sortBy      => parameter for sorting
      filter      => nfdump filter
      showonly    => limit number of records in result
      output      => format of output
  Output:
    id = integer with result id
=cut
sub query
{
  my $token = shift;
  my $queryParams = shift;
  my $id = shift;
  
  # construct flow query as url for REST API
  my $query = '/rest/fmc/analysis/flows?search={';
  $query .= '"from": "' . $$queryParams{'from'}.'",'; # must be a correct window (xx:00, xx:05, xx:10 etc.)
  $query .= '"to": "' . $$queryParams{'to'} . '",';
  $query .= '"profile": "live",';
  $query .= '"channels": ' . $$queryParams{'channels'} . ',';

  $query .= '"listing": {';
     $query .= '"aggregateBy": ' . $$queryParams{'aggregateBy'} . ',';
     $query .= '"sortBy": "' . $$queryParams{'sortBy'} . '" ';              
  $query .= '},';
 
  $query .= '"filter": "' . $$queryParams{'filter'}.'"';  
  $query .= '}&showonly=' . $$queryParams{'showonly'}; # limit number of records in result
  $query .= '&output=' . $$queryParams{'output'};
  
  my $client = REST::Client->new({
      host    => 'https://collector2.ics.muni.cz',
      ca      => '/root/Phigaro/ca.pem',
      timeout => 10,
  });
  # send request
  $client->request('POST', $query, '', {'Authorization' => 'bearer '.$token});

  # why it returns 201 on success??? should be 200 according to documentation
  if($client->responseCode() != 201){
    return (0, "Error occured: ".$client->responseContent());
  }

  $$id = JSON::from_json($client->responseContent())->{'id'};

  return 1;
}

=item getResult

  Requests result data for query with given id. If data are not ready yet, starts active 
  waiting and gives up after n tries.

  Input:
    token = string with access token
    id    = integer with requested result id
  Output:
    flows = json object with result data
=cut
sub getResult
{
  my $token = shift;
  my $id = shift;
  my $flows = shift;

  my $client = REST::Client->new({
      host    => 'https://collector2.ics.muni.cz',
      ca      => '/root/Phigaro/ca.pem',
      timeout => 10,
  });
  
  # wait for response to contain data
  # possible outcomes according to HTTP codes:
  #      200 - result is completed and we can return it
  #      202 - asynchronous result is still being computed, need to wait
  #      204 - query result contains no data or result with id does not exist 
  my $attempts = 0;     
  while(1){
    $attempts++;

    # returns query result with ID
    $client->request('GET', '/rest/fmc/analysis/results/'.$id, '', {'Authorization' => 'bearer '.$token});
    
    if($client->responseCode() == 200){
      # result OK
      $$flows = JSON::from_json($client->responseContent());
      return 1;
    } 
    elsif($client->responseCode() == 202){
      # result not completed yet, we wait some time and try again
      if($attempts > ($waitTime * 6)){
        #print "Giving up! :(\n";
        return (0, "Unable to retrieve data in time");
      }     
      #print "Result is not ready yet, waiting for 10s. Total time: ".($attempts/6)." minut.\n";
      sleep 10;
    }
    elsif($client->responseCode() == 204){
      # result is empty
      return (0,"Query returned no data or result with ID $id does not exists.");
    }
    else {
      # unexpected error
      return (0, "Unexpected response: ".$client->responseContent());
    }
  }

  # function should end in while cycle
  return (0, "Something went wrong");
}

=head1 AUTHOR

Martin Lastovicka (lastovicka@ics.muni.cz)

=cut

1;
