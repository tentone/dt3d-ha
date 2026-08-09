/**
 * Detect phone and tablet browsers, including iPadOS browsers that identify as macOS.
 */
export const isMobileDevice = (): boolean => {
	if (typeof navigator === "undefined") {
		return false;
	}

	const navigatorWithUserAgentData = navigator as Navigator & {
		userAgentData?: { mobile?: boolean };
	};
	if (navigatorWithUserAgentData.userAgentData?.mobile) {
		return true;
	}

	const userAgent = navigator.userAgent ?? "";
	if (
		/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Kindle|Silk/i.test(
			userAgent,
		)
	) {
		return true;
	}

	return (
		(navigator.platform === "MacIntel" || /Macintosh/i.test(userAgent)) &&
		navigator.maxTouchPoints > 1
	);
};
