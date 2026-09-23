FROM mcr.microsoft.com/playwright:v1.63.0-noble

USER root

RUN apt-get update \
  && apt-get install --yes --no-install-recommends \
    novnc \
    websockify \
    x11vnc \
    xvfb \
  && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/orderonline-runner-entrypoint
RUN chmod 0755 /usr/local/bin/orderonline-runner-entrypoint

ENTRYPOINT ["/usr/local/bin/orderonline-runner-entrypoint"]
