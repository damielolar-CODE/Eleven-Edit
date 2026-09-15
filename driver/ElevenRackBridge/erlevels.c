/**
 * @file erlevels.c
 * @brief Live input levels for Eleven Edit's VU meters (Eleven Edit build).
 *
 * Attaches read-only to the driver's shared ring and prints the engine's own
 * leaky-RMS meter for the two Eleven Rig channels (inputs 2 and 3) about
 * thirty times a second, one line per sample:
 *
 *     L <rmsL> R <rmsR> run <engineRunning> sr <sampleRate>
 *
 * Linear RMS, 0..1 full scale. Never writes to the ring, so it cannot disturb
 * the audio path, and it needs no microphone permission — the ring is plain
 * shared memory owned by the user's own engine process.
 *
 * Exits 2 if the ring does not exist (driver not installed, or the engine has
 * not started), and exits 0 when its stdin closes (the parent went away).
 *
 * Build: clang -O2 -o erlevels erlevels.c
 */
#include "ERAudioRing.h"
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <sys/select.h>

int main(int argc, char **argv) {
    int hz = argc > 1 ? atoi(argv[1]) : 30;
    if (hz < 5) hz = 5; if (hz > 60) hz = 60;
    ERRing *r = er_ring_attach();
    if (!r) { fprintf(stderr, "erlevels: ring not found\n"); return 2; }
    fcntl(0, F_SETFL, fcntl(0, F_GETFL) | O_NONBLOCK);
    setvbuf(stdout, NULL, _IOLBF, 0);
    const uint32_t chL = 2, chR = 3;   /* Eleven Rig L/R, see ERAudioRing.h channel map */
    for (;;) {
        /* stop when the parent closes our stdin */
        char buf[16];
        ssize_t n = read(0, buf, sizeof buf);
        if (n == 0) return 0;
        if (n < 0 && errno != EAGAIN && errno != EWOULDBLOCK) return 0;
        if (er_load32(&r->magic) != ER_RING_MAGIC) { fprintf(stderr, "erlevels: ring gone\n"); return 2; }
        float l = r->inLevel[chL], rr = r->inLevel[chR];
        if (!(l >= 0.f && l <= 4.f)) l = 0.f;
        if (!(rr >= 0.f && rr <= 4.f)) rr = 0.f;
        printf("L %.6f R %.6f run %u sr %u\n", l, rr, er_load32(&r->engineRunning), er_load32(&r->sampleRate));
        usleep(1000000 / hz);
    }
}
