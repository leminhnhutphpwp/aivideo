<?php

namespace App\Services\AntiAbuse;

/**
 * List of known disposable email domains.
 */
class DisposableEmailBlocklist
{
    private static array $domains = [
        'mailinator.com',
        'mailinator2.com',
        'mailinator.net',
        'mailinator.org',
        'mailinator.us',
        'mailinator.biz',
        'mailinator.info',
        'mailinator.co.uk',
        'mailinater.com',
        'mailnator.com',
        'mailnesia.com',
        'guerrillamail.com',
        'guerrillamail.net',
        'guerrillamail.org',
        'guerrillamail.biz',
        'guerrillamail.de',
        'guerrillamail.info',
        'sharklasers.com',
        'grr.la',
        'guerrillamailblock.com',
        'pokemail.net',
        'spam4.me',
        'throwam.com',
        'temp-mail.org',
        'temp-mail.io',
        'tempail.com',
        'tempmail.com',
        'tempmailaddress.com',
        'temporaryemail.net',
        'tempomail.fr',
        'tempmailbox.net',
        'tempr.email',
        '10minutemail.com',
        '10minutemail.net',
        '10minutemail.org',
        '10minmail.com',
        'minutemail.com',
        'minutmail.com',
        'yopmail.com',
        'yopmail.fr',
        'yopmail.net',
        'yopmail.pp.ua',
        'cool.fr.nf',
        'fakeinbox.com',
        'fakeinbox.org',
        'fakemailgenerator.com',
        'emailfake.com',
        'getnada.com',
        'nada.email',
        'inboxkitten.com',
        'mailcatch.com',
        'mailsac.com',
        'mail-temp.com',
        'trashmail.com',
        'trashmail.net',
        'trashmail.org',
        'trashmail.ws',
        'trashmail.me',
        'trashmail.at',
        'trashemail.de',
        'trashmailer.com',
        'trashymail.com',
        'trashymail.net',
        'mytrashmail.com',
        'dispostable.com',
        'discard.email',
        'discardmail.com',
        'discardmail.de',
        'disposableaddress.com',
        'disposableemailaddresses.com',
        'disposableinbox.com',
        'getairmail.com',
        'getairmail.net',
        'getonemail.com',
        'getonemail.net',
        'dropmail.me',
        'emailondeck.com',
        'mohmal.com',
        'mohmal.im',
        'mohmal.tech',
        'crazymailing.com',
        'mintemail.com',
        'spamgourmet.com',
        'spamex.com',
        'spamherelots.com',
        'spamfree24.org',
        'spambox.us',
        'spambox.xyz',
        'safetymail.info',
        'safetypost.de',
        'incognitomail.com',
        'incognitomail.net',
        'incognitomail.org',
        'hidemail.de',
        'meltmail.com',
        'mailforspam.com',
        'mailnoid.com',
        'tempsky.com',
        'thankyou2010.com',
        'thisisnotmyrealemail.com',
        'throam.com',
        'tilien.com',
        'trickmail.net',
        'wegwerfadresse.de',
        'wegwerf-email-addressen.de',
        'wegwerf-emails.de',
        'wegwerfmail.de',
        'wegwerfmail.info',
        'wegwerfmail.net',
        'wegwerfmail.org',
        'zehnminutenmail.de',
        'zippymail.info',
        'zoemail.com',
        'zoemail.net',
        'zoemail.org',
    ];

    public static function isDisposable(string $email): bool
    {
        $parts = explode('@', $email, 2);
        if (count($parts) !== 2) {
            return false;
        }
        
        $domain = strtolower(trim($parts[1]));
        
        if (empty($domain)) {
            return false;
        }

        if (in_array($domain, self::$domains, true)) {
            return true;
        }

        foreach (self::$domains as $disposable) {
            if (str_ends_with($domain, '.' . $disposable)) {
                return true;
            }
        }

        return false;
    }

    public static function count(): int
    {
        return count(self::$domains);
    }
}
