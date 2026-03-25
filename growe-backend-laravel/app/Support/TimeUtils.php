<?php

namespace App\Support;

class TimeUtils
{
    public static function isPast(string|\DateTimeInterface $iso): bool
    {
        $d = $iso instanceof \DateTimeInterface ? $iso : new \DateTimeImmutable((string) $iso);
        return $d->getTimestamp() < time();
    }
}

