function getReturnUrl (requestUrl) {
	var pattern=/.*flipkart.com.*\/p\/.*/;
	// var pattern=/.*flipkart.com.*pid=.*/;
	//var pt_new=/.*flipkart.com.*itm.*/;
	// var pt_fkt=/.*flipkart.com.* ? .*/;
	var newurl;
	var pattern2=/ozyxatech/;

	var amz_affid=/ozyxatech/;
	var amz_affid_usa=/ozyxatechblue/;
	var amz_pattern4=/.*amazon.in.*dp.*/;
	var amz_pattern5=/.*amazon.in.*gp.*product.*/;
	var amz_pattern6=/.*amazon.in.*product.* ? .*/;

	var amz_pattern10=/.*amazon.com.*dp.*/;
	var amz_pattern11=/.*amazon.com.*gp.*product.*/;
	var amz_pattern12=/.*amazon.com.*product.* ? .*/;

	var snp_pattern=/.*snapdeal.com.*product.*/;
	var snp_pattern2=/aff_id=6006/;



	if (pattern.test(requestUrl)) // if it matches pattern defined above
	{
		var fk_url = requestUrl;
		if (!pattern2.test(requestUrl))
		{
			var n = fk_url.indexOf("?");
			if(n === -1)
			{
				newurl = requestUrl+ "?affid=ozyxatech";
			}
			else
			{
				newurl = requestUrl+ "&affid=ozyxatech";
			}
			return newurl;
		}
	}



	if (amz_pattern6.test(requestUrl)|| amz_pattern4.test(requestUrl) ||amz_pattern5.test(requestUrl)) // if it matches pattern defined above
	 {
	 	var amz_url = requestUrl;
	 	var n = amz_url.indexOf("?");
	 	if (!amz_affid.test(requestUrl))
	 	{
	 		if(n === -1)
	 		{
	 			newurl = requestUrl+ "?tag=ozyxatech-21";
	 			return newurl;
	 		}
	 		else
	 		{
	 			newurl = requestUrl+ "&tag=ozyxatech-21";
	 			return newurl;
	 		}
		}
	}

	// if (amz_pattern10.test(requestUrl)|| amz_pattern11.test(requestUrl) ||amz_pattern12.test(requestUrl)) // if it matches pattern defined above
	//  {
	//  	var amz_url = requestUrl;
	//  	var n = amz_url.indexOf("?");
	//  	if (!amz_affid_usa.test(requestUrl))
	//  	{
	//  		if(n === -1)
	//  		{
	//  			newurl = requestUrl+ "?tag=ozyxatechblue-20";
	//  			return newurl;
	//  		}
	//  		else
	//  		{
	//  			newurl = requestUrl+ "&tag=ozyxatechblue-20";
	//  			return newurl;
	//  		}
	// 	}
	// }



	if (snp_pattern.test(requestUrl)) // if it matches pattern defined above
	 {
	 	var snp_url = requestUrl;
	 	var snp_splt = snp_url.split("//");
	 	var snp_split = snp_splt[1].split("/");
	 	if (snp_split[1] === "product")
	 	{
		 	if (!snp_pattern2.test(requestUrl))
			{
				newurl = "http://"+snp_split[0]+"/"+snp_split[1]+"/"+snp_split[2]+"/"+parseInt(snp_split[3])+"?utm_source=aff_prog&utm_campaign=afts&offer_id=16&aff_id=6006";
				return newurl;
			}
		}
	}
	return null;
}
